import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/dashboard/inquiries/appeal/route"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

const supabase = vi.hoisted(() => ({ getClaims: vi.fn(), getSession: vi.fn() }))
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: supabase }) }))

const route = "http://localhost:3000/api/dashboard/inquiries/appeal"
const cookie = "clinic-dashboard-auth=synthetic-session"
const appeal = { caseId: "case-123", text: " Please reconsider the measure. " }

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
  if (!response) throw new Error("Expected an appeal BFF response")
  return response
}

describe("ordinary clinic Inquiry appeal BFF", () => {
  const fetcher = vi.fn<typeof fetch>()
  let capabilities = ["clinic-inquiries:view"]

  function upstreamAppeal(body: unknown, status: number) {
    const original = fetcher.getMockImplementation()!
    fetcher.mockImplementation(async (url, options) =>
      String(url).endsWith("/inquiries/appeal") ? Response.json(body, { status }) : original(url, options),
    )
  }

  beforeEach(() => {
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
            capabilities,
            clinic: { id: "clinic-123", name: "Synthetic clinic" },
            principal: { displayName: "Synthetic staff", email: "staff@example.com", id: "staff-123" },
            status: "approved",
          },
          {
            headers: {
              "cache-control": "private, no-store",
              vary: "Authorization, X-Findmydoc-Clinic-Dashboard-Contract",
            },
          },
        )
      }
      if (String(url) === "https://preview.findmydoc.eu/api/clinic-dashboard/inquiries/appeal") {
        return Response.json({ submitted: true }, { status: 201 })
      }
      throw new Error("Unexpected external request")
    })
    vi.stubGlobal("fetch", fetcher)
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("submits through the current ordinary clinic session with view capability only", async () => {
    const response = await submit(signedRequest())
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ submitted: true })
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    const call = fetcher.mock.calls.find(([url]) => String(url).endsWith("/inquiries/appeal"))
    expect(call).toBeDefined()
    expect(call?.[1]).toMatchObject({
      body: JSON.stringify(appeal),
      cache: "no-store",
      headers: {
        Authorization: "Bearer synthetic-access-token",
        "X-Findmydoc-Clinic-Dashboard-Contract": "inquiry-communication-v2",
      },
      method: "POST",
      redirect: "error",
    })
    expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/inquiries/appeal"))).toHaveLength(1)
  })

  it("preserves the one-time appeal conflict without retrying or exposing upstream detail", async () => {
    upstreamAppeal({ error: { code: "MODERATION_INVALID_STATE", message: "Private upstream detail" } }, 409)
    const response = await submit(signedRequest())
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: { code: "invalid-state" } })
    expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/inquiries/appeal"))).toHaveLength(1)
  })

  it.each([
    ["MODERATION_INVALID_INPUT", 400, "invalid-input"],
    ["MODERATION_UNAUTHORIZED", 401, "unauthorized"],
    ["MODERATION_ACCESS_DENIED", 403, "access-denied"],
    ["MODERATION_NOT_FOUND", 404, "not-found"],
    ["MODERATION_CONFLICT", 409, "conflict"],
    ["MODERATION_RATE_LIMITED", 429, "rate-limited"],
    ["MODERATION_SERVICE_UNAVAILABLE", 503, "service-unavailable"],
  ] as const)("maps %s to a closed private BFF error", async (code, status, expected) => {
    upstreamAppeal({ error: { code, privateDetail: "not for the browser" } }, status)
    const response = await submit(signedRequest())
    expect(response.status).toBe(status)
    await expect(response.json()).resolves.toEqual({ error: { code: expected } })
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/inquiries/appeal"))).toHaveLength(1)
  })

  it.each([
    { caseId: "", text: "Appeal" },
    { caseId: "case-123", text: "  " },
    { caseId: "case-123", text: "x".repeat(1_001) },
    { ...appeal, clinicId: "other-clinic" },
    { ...appeal, expectedRevision: 1 },
    { ...appeal, idempotencyKey: "invented-replay" },
  ])("rejects invalid or authority-bearing input without submitting it", async (body) => {
    const response = await submit(signedRequest(body))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: { code: "invalid-input" } })
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith("/inquiries/appeal"))).toBe(false)
  })

  it("rejects a missing CSRF token before session or upstream access", async () => {
    const response = await submit(
      new NextRequest(route, {
        body: JSON.stringify(appeal),
        headers: { "content-type": "application/json", cookie, origin: "http://localhost:3000" },
        method: "POST",
      }),
    )
    expect(response.status).toBe(403)
    expect(supabase.getClaims).not.toHaveBeenCalled()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("rejects a foreign origin before session or upstream access", async () => {
    const request = signedRequest()
    request.headers.set("origin", "https://untrusted.example")
    expect((await submit(request)).status).toBe(403)
    expect(supabase.getClaims).not.toHaveBeenCalled()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("rejects a missing verified session without a business request", async () => {
    supabase.getClaims.mockResolvedValue({ data: { claims: null }, error: null })
    expect((await submit(signedRequest())).status).toBe(401)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("requires the current view capability, even when edit is present", async () => {
    capabilities = ["clinic-inquiries:edit"]
    expect((await submit(signedRequest())).status).toBe(403)
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith("/inquiries/appeal"))).toBe(false)
  })

  it("projects only the validated receipt from a successful upstream response", async () => {
    upstreamAppeal({ submitted: true, privateDetail: "not for the browser" }, 201)
    await expect((await submit(signedRequest())).json()).resolves.toEqual({ submitted: true })
  })

  it("does not turn a pending upstream response into an appeal receipt", async () => {
    upstreamAppeal({ submitted: true }, 202)
    const response = await submit(signedRequest())
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: { code: "service-unavailable" } })
  })

  it.each([{ submitted: false }, { submitted: "true" }, { raw: "private detail" }])(
    "fails closed for a malformed success receipt",
    async (body) => {
      upstreamAppeal(body, 201)
      const response = await submit(signedRequest())
      expect(response.status).toBe(503)
      await expect(response.json()).resolves.toEqual({ error: { code: "service-unavailable" } })
    },
  )

  it("does not retry an uncertain network failure", async () => {
    const original = fetcher.getMockImplementation()!
    fetcher.mockImplementation(async (url, options) => {
      if (String(url).endsWith("/inquiries/appeal")) throw new TypeError("Network failure")
      return original(url, options)
    })
    expect((await submit(signedRequest())).status).toBe(503)
    expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/inquiries/appeal"))).toHaveLength(1)
  })

  it("sanitizes an unknown upstream error instead of forwarding its body", async () => {
    upstreamAppeal({ error: { code: "UNRECOGNIZED", message: "Private diagnostic" } }, 409)
    const response = await submit(signedRequest())
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: { code: "service-unavailable" } })
  })

  it("keeps an uncertain timeout retry-free", async () => {
    const original = fetcher.getMockImplementation()!
    fetcher.mockImplementation(async (url, options) => {
      if (String(url).endsWith("/inquiries/appeal"))
        throw new DOMException("Deadline expired", "TimeoutError")
      return original(url, options)
    })
    const response = await submit(signedRequest())
    expect(response.status).toBe(504)
    await expect(response.json()).resolves.toEqual({ error: { code: "service-timeout" } })
    expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/inquiries/appeal"))).toHaveLength(1)
  })
})
