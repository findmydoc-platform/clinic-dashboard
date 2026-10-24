import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/dashboard/clinics/[clinicId]/support/route"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

const smtp = vi.hoisted(() => ({
  options: undefined as unknown,
  outcome: "accepted",
  messages: [] as unknown[],
  complete: undefined as (() => void) | undefined,
  authenticate: undefined as (() => void) | undefined,
}))
vi.mock("nodemailer/lib/smtp-connection", () => ({
  default: class {
    constructor(options: unknown) {
      smtp.options = options
    }
    secure = smtp.outcome !== "insecure"
    on() {}
    connect(done: (error?: Error) => void) {
      done()
    }
    login(_auth: unknown, done: (error?: Error) => void) {
      if (smtp.outcome === "auth-delay") {
        smtp.authenticate = done
        return
      }
      done()
    }
    send(envelope: unknown, message: unknown, done: (error: unknown, info?: unknown) => void) {
      smtp.messages.push({ envelope, message })
      if (smtp.outcome === "pending") {
        smtp.complete = () =>
          done(null, { response: "250 accepted", accepted: ["support@findmydoc.eu"], rejected: [] })
        return
      }
      if (smtp.outcome === "rejected") done({ responseCode: 550 })
      else if (smtp.outcome === "unknown") done(new Error("Synthetic connection loss"))
      else done(null, { response: "250 accepted", accepted: ["support@findmydoc.eu"], rejected: [] })
    }
    close() {}
  },
}))
vi.mock("nodemailer/lib/mail-composer", () => ({
  default: class {
    constructor(private message: unknown) {}
    compile() {
      return { createReadStream: () => this.message }
    }
  },
}))

const supabase = vi.hoisted(() => ({ getClaims: vi.fn(), getSession: vi.fn() }))
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: supabase }) }))

const route = "http://localhost:3000/api/dashboard/clinics/clinic-123/support"
const cookie = "clinic-dashboard-auth=synthetic-session"
const appeal = { subject: "Profile update failed", message: "The clinic profile fails to save the changes." }

function signedRequest(body: unknown = appeal) {
  const headers = { "content-type": "application/json", cookie, origin: "http://localhost:3000" }
  const token = createCsrfToken(new NextRequest(route, { headers, method: "POST" }))
  return new NextRequest(route, {
    body: JSON.stringify(body),
    headers: {
      ...headers,
      cookie: `${cookie}; clinic_dashboard_csrf=${token}`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
    },
    method: "POST",
  })
}

async function submit(request: NextRequest) {
  const response = await POST(request)
  if (!response) throw new Error("Expected a support BFF response")
  return response
}

describe("protected clinic support command", () => {
  const fetcher = vi.fn<typeof fetch>()
  let capabilities = ["clinic-inquiries:view"]

  beforeEach(() => {
    smtp.options = undefined
    smtp.complete = undefined
    smtp.authenticate = undefined
    smtp.messages = []
    smtp.outcome = "accepted"
    vi.stubEnv("SUPPORT_SMTP_APP_PASSWORD", "abcdefghijklmnop")
    capabilities = ["clinic-inquiries:view"]
    vi.stubEnv("CLINIC_DASHBOARD_AUTH_TEST_MODE", undefined)
    // Synthetic signing fixture; never an operational credential.
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef") // pragma: allowlist secret
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "synthetic-publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    vi.stubEnv("VERCEL_ENV", undefined)
    supabase.getClaims.mockResolvedValue({
      data: {
        claims: { app_metadata: { user_type: "clinic" }, email: "staff@example.com", sub: "staff-123" },
      },
      error: null,
    })
    supabase.getSession.mockResolvedValue({
      data: { session: { access_token: "synthetic-access-token" } },
      error: null,
    })
    fetcher.mockImplementation(async (url) => {
      if (String(url) === "https://preview.findmydoc.eu/api/clinic-dashboard/bootstrap") {
        return Response.json(
          {
            schemaVersion: "clinic-scope-v1",
            clinics: [{ id: "clinic-123", name: "Synthetic clinic", capabilities }],
            principal: { displayName: "Synthetic staff", email: "staff@example.com", id: "staff-123" },
            status: "approved",
          },
          {
            headers: {
              "cache-control": "private, no-store",
              vary: "Authorization, X-Findmydoc-Clinic-Dashboard-Contract, X-Findmydoc-Clinic-Scope-Contract",
            },
          },
        )
      }
      if (String(url) === "https://preview.findmydoc.eu/api/clinic-dashboard/clinics/clinic-123/support") {
        return Response.json({ submitted: true }, { status: 201 })
      }
      throw new Error("Unexpected external request")
    })
    vi.stubGlobal("fetch", fetcher)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("submits with trusted identity and fixed mail destinations", async () => {
    const response = await submit(signedRequest())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: "accepted" })
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(smtp.messages).toEqual([
      {
        envelope: { from: "info@findmydoc.eu", to: ["support@findmydoc.eu"] },
        message: expect.objectContaining({
          from: "info@findmydoc.eu",
          to: "support@findmydoc.eu",
          replyTo: "staff@example.com",
          subject: "Profile update failed",
          text: expect.stringContaining("Synthetic clinic"),
        }),
      },
    ])
  })
  it.each(["rejected", "unknown"])("reports %s without retry or exposing mail detail", async (outcome) => {
    smtp.outcome = outcome
    const response = await submit(signedRequest())
    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({ status: outcome === "rejected" ? "failed" : "unknown" })
    expect(smtp.messages).toHaveLength(1)
  })
  it.each([
    { ...appeal, replyEmail: "stranger@example.com" },
    { ...appeal, from: "stranger@example.com" },
    { ...appeal, to: "stranger@example.com" },
    { ...appeal, clinicId: "another-clinic" },
    { ...appeal, subject: "Injected\r\nBcc: stranger@example.com" },
    { ...appeal, message: "x".repeat(5001) },
  ])("rejects invalid or authority-bearing input before SMTP", async (input) => {
    expect((await submit(signedRequest(input))).status).toBe(400)
    expect(smtp.messages).toHaveLength(0)
  })
  it("requires a verified session before SMTP", async () => {
    supabase.getClaims.mockResolvedValue({ data: { claims: null }, error: null })
    expect((await submit(signedRequest())).status).toBe(401)
    expect(smtp.messages).toHaveLength(0)
  })
  it("denies a clinic outside the authorized bootstrap", async () => {
    const request = signedRequest()
    const other = new NextRequest(request.url.replace("clinic-123", "other-clinic"), request)
    expect((await submit(other)).status).toBe(403)
    expect(smtp.messages).toHaveLength(0)
  })
  it("rejects missing mutation verification before session and SMTP", async () => {
    expect(
      (await submit(new NextRequest(route, { method: "POST", body: JSON.stringify(appeal) }))).status,
    ).toBe(403)
    expect(supabase.getClaims).not.toHaveBeenCalled()
    expect(smtp.messages).toHaveLength(0)
  })
  it("fails closed when SMTP configuration is missing", async () => {
    vi.stubEnv("SUPPORT_SMTP_APP_PASSWORD", undefined)
    const response = await submit(signedRequest())
    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({ status: "failed" })
    expect(smtp.messages).toHaveLength(0)
  })
  it("waits for final SMTP acceptance before confirming the request", async () => {
    smtp.outcome = "pending"
    let completed = false
    const pending = submit(signedRequest()).then((response) => {
      completed = true
      return response
    })
    await vi.waitFor(() => expect(smtp.messages).toHaveLength(1))
    expect(completed).toBe(false)
    smtp.complete!()
    await expect((await pending).json()).resolves.toEqual({ status: "accepted" })
  })
  it("reports an unconfirmed outcome at the total deadline without a second mail", async () => {
    vi.useFakeTimers()
    smtp.outcome = "pending"
    const pending = submit(signedRequest())
    await vi.advanceTimersByTimeAsync(0)
    expect(smtp.messages).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(20_000)
    await expect((await pending).json()).resolves.toEqual({ status: "unknown" })
    smtp.complete!()
    expect(smtp.messages).toHaveLength(1)
  })
  it("does not submit after authentication completes beyond the deadline", async () => {
    vi.useFakeTimers()
    smtp.outcome = "auth-delay"
    const pending = submit(signedRequest())
    await vi.advanceTimersByTimeAsync(20_000)
    await expect((await pending).json()).resolves.toEqual({ status: "failed" })
    smtp.authenticate!()
    expect(smtp.messages).toHaveLength(0)
  })
  it("requires verified STARTTLS for the fixed Workspace SMTP server", async () => {
    await submit(signedRequest())
    expect(smtp.options).toMatchObject({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      tls: { servername: "smtp.gmail.com", rejectUnauthorized: true, minVersion: "TLSv1.2" },
    })
  })
  it("requires an encrypted SMTP connection", async () => {
    smtp.outcome = "insecure"
    await expect((await submit(signedRequest())).json()).resolves.toEqual({ status: "failed" })
    expect(smtp.messages).toHaveLength(0)
  })
})
