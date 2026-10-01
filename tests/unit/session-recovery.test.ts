import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ createServerClient: vi.fn(), cookies: vi.fn() }))
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }))
vi.mock("next/headers", () => ({ cookies: mocks.cookies }))

import { POST } from "@/app/api/auth/session/recover/route"
import { getClinicDashboardAccess } from "@/features/clinic-dashboard/auth/server/public"
import { createCsrfToken } from "@/lib/security/csrf"

const origin = "http://localhost:3000"
function request(next = "/?inquiry=inquiry-1", mode = "refresh", attempt = "") {
  const cookie = "clinic-dashboard-auth=old; clinic-dashboard-auth.0=old-chunk"
  const base = new NextRequest(`${origin}/api/auth/session/recover`, { headers: { cookie } })
  const csrf = createCsrfToken(base)
  return new NextRequest(base.url, {
    method: "POST",
    headers: {
      cookie: `${cookie}; clinic_dashboard_csrf=${csrf}`,
      origin,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ attempt, csrf, mode, next }).toString(),
  })
}

function bootstrap(status = 200) {
  return new Response(
    JSON.stringify(
      status === 200
        ? {
            capabilities: [
              "clinic-profile:view",
              "clinic-profile:edit",
              "clinic-treatments:view",
              "clinic-treatments:edit",
            ],
            clinic: { id: "clinic-1", name: "Synthetic Clinic" },
            principal: { id: "staff-1", email: "staff@example.test", displayName: "Staff" },
            status: "approved",
          }
        : {
            error: {
              code:
                status === 401
                  ? "CLINIC_DASHBOARD_UNAUTHORIZED"
                  : status === 403
                    ? "CLINIC_DASHBOARD_ACCESS_DENIED"
                    : "CLINIC_DASHBOARD_TEMPORARILY_UNAVAILABLE",
            },
          },
    ),
    {
      status,
      headers: {
        "cache-control": "private, no-store",
        vary: "Authorization, X-Findmydoc-Clinic-Dashboard-Contract",
      },
    },
  )
}

function installClient({ refreshFails = false, losesSession = false } = {}) {
  let token = "old-token"
  const auth = {
    getClaims: vi.fn(async () => ({
      data: {
        claims: { sub: "staff-1", email: "staff@example.test", app_metadata: { user_type: "clinic" } },
      },
      error: null,
    })),
    getSession: vi.fn(async () => ({ data: { session: { access_token: token } }, error: null })),
    refreshSession: vi.fn(),
    signOut: vi.fn(async () => ({ error: null })),
  }
  mocks.createServerClient.mockImplementation((_url, _key, options) => {
    auth.refreshSession.mockImplementation(async () => {
      if (refreshFails) return { error: new Error("invalid refresh") }
      token = "new-token"
      if (losesSession) auth.getClaims.mockResolvedValue({ data: { claims: null }, error: null } as never)
      options.cookies.setAll(
        [
          { name: "clinic-dashboard-auth", value: "new-cookie", options: { domain: "unsafe.example" } },
          { name: "clinic-dashboard-auth.1", value: "new-chunk", options: {} },
        ],
        { "cache-control": "private, no-store" },
      )
      return { error: null }
    })
    return { auth }
  })
  return auth
}

describe("initial-read session recovery", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", origin)
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => bootstrap()),
    )
  })
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("refreshes once, retries with the new token and sends cookies to the browser", async () => {
    const auth = installClient()
    const response = await POST(request())
    expect(auth.refreshSession).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledOnce()
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: "Bearer new-token" })
    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toMatch(
      /^http:\/\/localhost:3000\/\?inquiry=inquiry-1&sessionRecovery=.+/u,
    )
    expect(response.headers.get("set-cookie")).toContain("clinic-dashboard-auth=new-cookie")
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    expect(response.headers.get("set-cookie")).not.toContain("Domain=")
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(auth.signOut).not.toHaveBeenCalled()
  })

  it.each(["refresh", "clear"])("clears all auth chunks after rejection in %s mode", async (mode) => {
    const auth = installClient()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => bootstrap(401)),
    )
    const response = await POST(request("/?inquiry=inquiry-1", mode))
    expect(auth.refreshSession).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledOnce()
    expect(response.headers.get("location")).toBe(`${origin}/login?next=%2F%3Finquiry%3Dinquiry-1`)
    expect(response.headers.get("set-cookie")).toContain("clinic-dashboard-auth=;")
    expect(response.headers.get("set-cookie")).toContain("clinic-dashboard-auth.0=;")
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0")
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" })
  })

  it("clears newly written chunks even when local sign-out fails", async () => {
    const auth = installClient()
    auth.signOut.mockRejectedValue(new Error("sign-out unavailable"))
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => bootstrap(401)),
    )
    const response = await POST(request())
    expect(response.headers.get("set-cookie")).toContain("clinic-dashboard-auth.1=;")
    expect(response.headers.get("set-cookie")).not.toContain("new-chunk")
  })

  it.each([{ refreshFails: true }, { losesSession: true }])(
    "clears invalid cookies when refresh cannot restore the session: %j",
    async (options) => {
      const auth = installClient(options)
      const response = await POST(request())
      expect(auth.refreshSession).toHaveBeenCalledOnce()
      expect(fetch).not.toHaveBeenCalled()
      expect(response.headers.get("location")).toBe(`${origin}/login?next=%2F%3Finquiry%3Dinquiry-1`)
      expect(response.headers.get("set-cookie")).toContain("clinic-dashboard-auth.0=;")
    },
  )

  it("does not let a forged final-mode link bypass refresh", async () => {
    const auth = installClient()
    const response = await POST(request("/", "clear", "1"))
    expect(auth.refreshSession).toHaveBeenCalledOnce()
    expect(auth.signOut).not.toHaveBeenCalled()
    expect(new URL(response.headers.get("location")!).pathname).toBe("/")
  })

  it("terminates a signed second attempt without another refresh or bootstrap", async () => {
    const auth = installClient()
    const first = await POST(request("/"))
    const attempt = new URL(first.headers.get("location")!).searchParams.get("sessionRecovery")!
    const base = new NextRequest(`${origin}/api/auth/session/recover`, {
      headers: {
        cookie:
          "clinic-dashboard-auth=new-cookie; clinic-dashboard-auth.0=old-chunk; clinic-dashboard-auth.1=new-chunk",
      },
    })
    const csrf = createCsrfToken(base)
    vi.mocked(fetch).mockClear()
    const response = await POST(
      new NextRequest(base.url, {
        method: "POST",
        headers: {
          cookie: `${base.headers.get("cookie")}; clinic_dashboard_csrf=${csrf}`,
          origin,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ attempt, csrf, mode: "clear", next: "/" }).toString(),
      }),
    )
    expect(auth.refreshSession).toHaveBeenCalledOnce()
    expect(fetch).not.toHaveBeenCalled()
    expect(response.headers.get("location")).toBe(`${origin}/login`)
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0")
  })

  it.each([
    [401, "recovery-required"],
    [403, "denied"],
    [503, "temporarily-unavailable"],
    [200, "approved"],
  ])("keeps the initial server read read-only for Payload %s", async (status, expected) => {
    const auth = installClient()
    mocks.cookies.mockResolvedValue(new NextRequest(origin).cookies)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => bootstrap(Number(status))),
    )
    await expect(getClinicDashboardAccess()).resolves.toMatchObject({ status: expected })
    expect(auth.refreshSession).not.toHaveBeenCalled()
    expect(auth.signOut).not.toHaveBeenCalled()
    expect(mocks.createServerClient.mock.calls[0]?.[2].cookies.setAll).toBeUndefined()
  })

  it("sends a missing initial session directly to login without contacting Payload", async () => {
    const auth = installClient()
    mocks.cookies.mockResolvedValue(new NextRequest(origin).cookies)
    auth.getClaims.mockResolvedValue({ data: { claims: null }, error: null } as never)
    await expect(getClinicDashboardAccess()).resolves.toEqual({ status: "unauthenticated" })
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    [403, "/access"],
    [503, "/access?state=temporarily-unavailable"],
  ])("preserves the session after retry returns %s", async (status, destination) => {
    const auth = installClient()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => bootstrap(Number(status))),
    )
    const response = await POST(request())
    expect(response.headers.get("location")).toBe(`${origin}${destination}`)
    expect(auth.signOut).not.toHaveBeenCalled()
    expect(response.headers.get("set-cookie")).not.toContain("Max-Age=0")
  })

  it.each(["https://attacker.example", "//attacker.example", "/?inquiry=unsafe/path", "/?sessionRecovery=1"])(
    "rejects foreign or noncanonical destination %s",
    async (next) => {
      installClient()
      expect((await POST(request(next))).status).toBe(400)
      expect(mocks.createServerClient).not.toHaveBeenCalled()
      expect(fetch).not.toHaveBeenCalled()
    },
  )

  it.each(["origin", "csrf"])("rejects missing %s before any upstream request", async (missing) => {
    installClient()
    const original = request()
    const headers = new Headers(original.headers)
    const fields = new URLSearchParams(await original.text())
    if (missing === "origin") headers.delete("origin")
    else fields.set("csrf", "invalid-token")
    const response = await POST(
      new NextRequest(original.url, { method: "POST", headers, body: fields.toString() }),
    )
    expect(response.status).toBe(403)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(mocks.createServerClient).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("clears cookies without retry when no verified session remains", async () => {
    const auth = installClient()
    auth.getClaims.mockResolvedValueOnce({ data: { claims: null }, error: null } as never)
    const response = await POST(request())
    expect(auth.refreshSession).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    expect(response.headers.get("set-cookie")).toContain("clinic-dashboard-auth.0=;")
  })
})
