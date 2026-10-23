import { randomBytes } from "node:crypto"
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/auth/invite/complete/route"
import { encodeCompletionGrant } from "@/features/clinic-dashboard/auth/server/public"
import { createCsrfToken, isValidCsrfToken } from "@/lib/security/csrf"
import { proxy } from "@/proxy"

const subject = "3525d8e2-0ff0-44cc-9f14-ad8a783a57dd"
const origin = "http://localhost:3000"

function fixture(
  options: { failedRefresh?: boolean; uncertainCompletion?: boolean; grantSubject?: string } = {},
) {
  const now = Math.floor(Date.now() / 1000)
  const user = {
    id: subject,
    email: "synthetic@example.invalid",
    app_metadata: { user_type: "clinic" },
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  }
  const jwt = (exp: number) =>
    [
      Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
      Buffer.from(
        JSON.stringify({ sub: subject, email: user.email, app_metadata: user.app_metadata, exp }),
      ).toString("base64url"),
      Buffer.from("offline-provider-signature").toString("base64url"),
    ].join(".")
  const renewedToken = jwt(now + 3600)
  let refreshes = 0
  let completions = 0
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input.toString())
    if (url.origin === "https://abcdefghijklmnopqrst.supabase.co") {
      if (url.pathname.endsWith("/token")) {
        refreshes++
        if (options.failedRefresh)
          return Response.json(
            { code: "refresh_token_not_found", msg: "Synthetic ended session" },
            { status: 400 },
          )
        return Response.json({
          access_token: renewedToken,
          refresh_token: "offline-renewed-session",
          expires_at: now + 3600,
          expires_in: 3600,
          token_type: "bearer",
          user,
        })
      }
      if (url.pathname.endsWith("/user") && (!init?.method || init.method === "GET"))
        return Response.json(user)
      if (url.pathname.endsWith("/logout")) return new Response(null, { status: 204 })
    }
    if (url.origin === "https://website.synthetic.invalid" && url.pathname.endsWith("/completeAction")) {
      const body = JSON.parse(init!.body as string)
      expect(body.accessToken).toBe(renewedToken)
      completions++
      return options.uncertainCompletion
        ? Response.json(
            { version: 1, ok: false, code: "AUTH_ACTION_TEMPORARILY_UNAVAILABLE" },
            { status: 503 },
          )
        : Response.json({ version: 1, ok: true, outcome: "completed" })
    }
    throw new Error("Unexpected offline provider operation")
  })
  vi.stubGlobal("fetch", fetchMock)
  const session = {
    access_token: jwt(now - 120),
    refresh_token: "offline-original-session",
    expires_at: now - 120,
    expires_in: 3600,
    token_type: "bearer",
    user,
  }
  const grant = encodeCompletionGrant({
    actionRef: "offline-invitation-reference",
    flow: "invite",
    issuedAt: now - 60,
    state: "confirmed",
    subject: options.grantSubject ?? subject,
  })
  const password = randomBytes(16).toString("hex")
  const request = new NextRequest(`${origin}/api/auth/invite/complete`, {
    method: "POST",
    body: JSON.stringify({ password, confirmPassword: password }),
    headers: {
      origin,
      "content-type": "application/json",
      cookie: `clinic-dashboard-auth=base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}; clinic_dashboard_completion_grant=${grant}`,
    },
  })
  const csrf = createCsrfToken(request)
  request.cookies.set("clinic_dashboard_csrf", csrf)
  request.headers.set("x-csrf-token", csrf)
  return { request, effects: () => ({ refreshes, completions }) }
}

describe("password completion through the session proxy", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("CSRF_SIGNING_SECRET", randomBytes(32).toString("hex"))
    vi.stubEnv("DASHBOARD_ORIGIN", origin)
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("PAYLOAD_API_URL", "https://website.synthetic.invalid")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "offline-public-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    vi.stubEnv(
      "AUTH_ACTION_PROTOCOL_SERVICE_KEYS_JSON",
      JSON.stringify({
        environment: "test",
        service: [{ version: "v1", secret: randomBytes(32).toString("hex") }],
      }),
    )
    vi.spyOn(console, "error").mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("completes a valid invitation after the same identity refreshes without invalidating submitted CSRF", async () => {
    const f = fixture()
    await proxy(f.request)
    const response = await POST(f.request)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ redirectTo: "/login?status=invite-complete" })
    expect(f.effects()).toEqual({ refreshes: 1, completions: 1 })
  })

  it.each(["missing", "wrong", "foreign-origin"])(
    "rejects %s CSRF before refreshing or completing",
    async (kind) => {
      const f = fixture()
      if (kind === "missing") f.request.headers.delete("x-csrf-token")
      if (kind === "wrong") f.request.headers.set("x-csrf-token", "not-the-cookie-token")
      if (kind === "foreign-origin") f.request.headers.set("origin", "https://foreign.synthetic.invalid")
      await proxy(f.request)
      const response = await POST(f.request)
      expect(response.status).toBe(403)
      expect(f.effects()).toEqual({ refreshes: 0, completions: 0 })
    },
  )

  it("requires the renewed identity to match the confirmed invitation", async () => {
    const f = fixture({ grantSubject: "another-clinic-subject" })
    await proxy(f.request)
    const response = await POST(f.request)
    expect(response.status).toBe(401)
    expect(f.effects()).toEqual({ refreshes: 1, completions: 0 })
  })

  it("rejects an ended provider session without invoking Website password completion", async () => {
    const f = fixture({ failedRefresh: true })
    await proxy(f.request)
    const response = await POST(f.request)
    expect(response.status).toBe(401)
    expect(f.effects()).toEqual({ refreshes: 1, completions: 0 })
  })

  it("keeps uncertain completion explicit and returns CSRF bound to its renewed session", async () => {
    const f = fixture({ uncertainCompletion: true })
    await proxy(f.request)
    const response = await POST(f.request)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: "AUTH_COMPLETION_UNCERTAIN" })
    expect(f.effects()).toEqual({ refreshes: 1, completions: 1 })
    const browser = new NextRequest(`${origin}/api/auth/invite/complete`, { headers: f.request.headers })
    for (const cookie of response.cookies.getAll()) {
      if (cookie.maxAge === 0) browser.cookies.delete(cookie.name)
      else browser.cookies.set(cookie.name, cookie.value)
    }
    expect(isValidCsrfToken(browser, response.cookies.get("clinic_dashboard_csrf")?.value)).toBe(true)
    expect(response.cookies.get("clinic_dashboard_completion_grant")).toBeDefined()
  })
})
