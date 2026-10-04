import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { createRouteSupabaseClientMock } = vi.hoisted(() => ({
  createRouteSupabaseClientMock: vi.fn(),
}))

vi.mock("@/features/clinic-dashboard/auth/server/supabase-client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/clinic-dashboard/auth/server/supabase-client")>()
  return {
    ...actual,
    createRouteSupabaseClient: createRouteSupabaseClientMock,
  }
})

import {
  encodeCompletionGrant,
  encodePendingEmailCallback,
  handleClinicDashboardEmailCallback,
  handleClinicDashboardLogin,
  handleClinicDashboardLogout,
  handleClinicDashboardPasswordCompletion,
  handleClinicDashboardPasswordResetRequest,
  handleClinicDashboardReauthenticate,
} from "@/features/clinic-dashboard/auth/server/public"
import { createCsrfToken, isValidCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

function approvedBootstrapResponse(
  capabilities: readonly string[] = [
    "clinic-profile:view",
    "clinic-profile:edit",
    "clinic-treatments:view",
    "clinic-treatments:edit",
    "clinic-inquiries:view",
  ],
) {
  return new Response(
    JSON.stringify({
      capabilities,
      clinic: { id: "clinic-1", name: "Clinic One" },
      principal: { displayName: "Alex", email: "alex@example.com", id: "staff-1" },
      status: "approved",
    }),
    {
      headers: {
        "cache-control": "private, no-store",
        vary: "Authorization, X-Findmydoc-Clinic-Dashboard-Contract",
      },
    },
  )
}

function deniedBootstrapResponse() {
  return new Response(
    JSON.stringify({
      error: { code: "CLINIC_DASHBOARD_ACCESS_DENIED" },
    }),
    {
      headers: {
        "cache-control": "private, no-store",
        vary: "Authorization, X-Findmydoc-Clinic-Dashboard-Contract",
      },
      status: 403,
    },
  )
}

function mutationRequest(
  pathname: string,
  body: Record<string, string>,
  cookies: readonly string[] = [],
  origin = "http://localhost:3000",
) {
  const url = `${origin}${pathname}`
  const baseRequest = new NextRequest(url, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      cookie: cookies.join("; "),
      origin,
    },
    method: "POST",
  })
  const token = createCsrfToken(baseRequest)

  return new NextRequest(url, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      cookie: [...cookies, `clinic_dashboard_csrf=${token}`].join("; "),
      origin,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
    },
    method: "POST",
  })
}

function createClient(userType = "clinic") {
  return {
    auth: {
      getClaims: vi.fn(async () => ({
        data: {
          claims: {
            app_metadata: { user_type: userType },
            email: "alex@example.com",
            sub: "staff-1",
          },
        },
        error: null,
      })),
      getSession: vi.fn(async () => ({
        data: { session: { access_token: "server-access-token" } },
        error: null,
      })),
      refreshSession: vi.fn(async () => ({ data: { session: {} }, error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      updateUser: vi.fn(async () => ({ data: {}, error: null })),
      verifyOtp: vi.fn(async () => ({ data: {}, error: null })),
    },
  }
}

function installRouteClient(client = createClient()) {
  const applyToResponse = vi.fn((response) => {
    response.headers.set("x-route-client-applied", "true")
    return response
  })
  createRouteSupabaseClientMock.mockReturnValue({
    applyToResponse,
    client,
  })
  return { applyToResponse, client }
}

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe("private, no-store")
  expect(response.headers.get("pragma")).toBe("no-cache")
  expect(response.headers.get("expires")).toBe("0")
}

describe("production authentication actions", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    vi.stubEnv(
      "AUTH_ACTION_PROTOCOL_SERVICE_KEYS_JSON",
      JSON.stringify({
        environment: "test",
        service: [{ version: "v1", secret: "test-service-key-0123456789abcdef0123456789" }], // pragma: allowlist secret - public synthetic fixture
      }),
    )
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => approvedBootstrapResponse()),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("signs in through Supabase and returns only the controlled redirect", async () => {
    const { client } = installRouteClient()
    const response = await handleClinicDashboardLogin(
      mutationRequest("/api/auth/login", {
        email: "alex@example.com",
        next: "/",
        password: "password123",
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ redirectTo: "/" })
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "alex@example.com",
      password: "password123",
    })
    expect(response.headers.get("x-route-client-applied")).toBe("true")
    expectPrivate(response)
  })

  it("preserves one validated inquiry return target after production access approval", async () => {
    installRouteClient()
    const response = await handleClinicDashboardLogin(
      mutationRequest("/api/auth/login", {
        email: "alex@example.com",
        next: "/?inquiry=inquiry-lukas-weber",
        password: "password123",
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ redirectTo: "/?inquiry=inquiry-lukas-weber" })
  })

  it("reauthenticates the current production subject with its verified email", async () => {
    const { client } = installRouteClient()

    const response = await handleClinicDashboardReauthenticate(
      mutationRequest("/api/auth/reauthenticate", { password: "current-password" }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ reauthenticated: true })
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "alex@example.com",
      password: "current-password",
    })
    expect(client.auth.signOut).not.toHaveBeenCalled()
    expectPrivate(response)
  })

  it("rejects a wrong production reauthentication password without clearing the current session", async () => {
    const client = createClient()
    client.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: { status: 400 } } as never)
    installRouteClient(client)

    const response = await handleClinicDashboardReauthenticate(
      mutationRequest("/api/auth/reauthenticate", { password: "wrong-password" }),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ code: "INVALID_CREDENTIALS" })
    expect(client.auth.signOut).not.toHaveBeenCalled()
    expectPrivate(response)
  })

  it("rejects production reauthentication without inquiry view capability", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        approvedBootstrapResponse([
          "clinic-profile:view",
          "clinic-profile:edit",
          "clinic-treatments:view",
          "clinic-treatments:edit",
        ]),
      ),
    )
    const { client } = installRouteClient()

    const response = await handleClinicDashboardReauthenticate(
      mutationRequest("/api/auth/reauthenticate", { password: "current-password" }),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ code: "REQUEST_REJECTED" })
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(client.auth.signOut).not.toHaveBeenCalled()
    expectPrivate(response)
  })

  it("clears the local production session when reauthentication changes the subject", async () => {
    const client = createClient()
    client.auth.getClaims
      .mockResolvedValueOnce({
        data: {
          claims: {
            app_metadata: { user_type: "clinic" },
            email: "alex@example.com",
            sub: "staff-1",
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          claims: {
            app_metadata: { user_type: "clinic" },
            email: "alex@example.com",
            sub: "staff-1",
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          claims: {
            app_metadata: { user_type: "clinic" },
            email: "other@example.com",
            sub: "staff-2",
          },
        },
        error: null,
      })
    installRouteClient(client)

    const response = await handleClinicDashboardReauthenticate(
      mutationRequest("/api/auth/reauthenticate", { password: "current-password" }, [
        "clinic-dashboard-auth=session-cookie",
        "clinic-dashboard-auth.0=session-chunk",
      ]),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ code: "ACCOUNT_UNAVAILABLE" })
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" })
    expect(response.headers.get("set-cookie")).toContain("clinic-dashboard-auth=;")
    expect(response.headers.get("set-cookie")).toContain("clinic-dashboard-auth.0=;")
    expectPrivate(response)
  })

  it("sanitizes invalid credentials and rejects a non-clinic principal", async () => {
    const invalidClient = createClient()
    invalidClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { status: 400 },
    } as never)
    installRouteClient(invalidClient)

    const invalid = await handleClinicDashboardLogin(
      mutationRequest("/api/auth/login", {
        email: "alex@example.com",
        next: "/",
        password: "wrong-password",
      }),
    )
    expect(invalid.status).toBe(401)
    await expect(invalid.json()).resolves.toEqual({ code: "INVALID_CREDENTIALS" })
    expectPrivate(invalid)

    const unavailableClient = createClient("patient")
    installRouteClient(unavailableClient)
    const unavailable = await handleClinicDashboardLogin(
      mutationRequest("/api/auth/login", {
        email: "alex@example.com",
        next: "/",
        password: "password123",
      }),
    )
    expect(unavailable.status).toBe(401)
    await expect(unavailable.json()).resolves.toEqual({ code: "ACCOUNT_UNAVAILABLE" })
    expect(unavailableClient.auth.signOut).toHaveBeenCalledWith({ scope: "local" })
  })

  it("forwards recovery through the Website protocol and keeps failures neutral", async () => {
    vi.stubEnv("VERCEL", "1")
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("DASHBOARD_ORIGIN", "https://clinics.preview.findmydoc.eu")
    vi.stubEnv(
      "AUTH_ACTION_PROTOCOL_SERVICE_KEYS_JSON",
      JSON.stringify({
        environment: "preview",
        service: [{ version: "v1", secret: "test-service-key-0123456789abcdef0123456789" }], // pragma: allowlist secret - public synthetic fixture
      }),
    )
    const { client } = installRouteClient()
    const fetcher = vi.fn(async () => {
      throw new Error("Website unavailable")
    })
    vi.stubGlobal("fetch", fetcher)
    const request = mutationRequest(
      "/api/auth/password/reset",
      { email: "unknown@example.com" },
      [],
      "https://clinics.preview.findmydoc.eu",
    )
    request.headers.set("x-vercel-forwarded-for", "203.0.113.7")

    const response = await handleClinicDashboardPasswordResetRequest(request)
    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({ accepted: true })
    expect(client.auth.resetPasswordForEmail).not.toHaveBeenCalled()
    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://preview.findmydoc.eu/api/internal/auth-actions/v1/requestRecovery"),
      expect.objectContaining({
        body: JSON.stringify({ email: "unknown@example.com", clientIP: "203.0.113.7" }),
        cache: "no-store",
        method: "POST",
        redirect: "error",
      }),
    )
    expectPrivate(response)
  })

  it.each([
    "https://clinics.preview.findmydoc.eu",
    "https://clinic-dashboard-5gepqbsiw-findmydoc.vercel.app",
  ])("accepts narrow recovery on trusted preview origin %s", async (origin) => {
    vi.stubEnv("DASHBOARD_ORIGIN", "https://clinics.preview.findmydoc.eu")
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_URL", "clinic-dashboard-5gepqbsiw-findmydoc.vercel.app")
    const response = await handleClinicDashboardPasswordResetRequest(
      mutationRequest("/api/auth/password/reset", { email: "alex@example.com" }, [], origin),
    )

    expect(response.status).toBe(202)
    expect(createRouteSupabaseClientMock).not.toHaveBeenCalled()
    expectPrivate(response)
  })

  it("rejects an untrusted preview reset origin before calling Supabase", async () => {
    vi.stubEnv("DASHBOARD_ORIGIN", "https://clinics.preview.findmydoc.eu")
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_URL", "clinic-dashboard-5gepqbsiw-findmydoc.vercel.app")
    installRouteClient()

    const response = await handleClinicDashboardPasswordResetRequest(
      mutationRequest(
        "/api/auth/password/reset",
        { email: "alex@example.com" },
        [],
        "https://clinic-dashboard-other-findmydoc.vercel.app",
      ),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ code: "REQUEST_REJECTED" })
    expect(createRouteSupabaseClientMock).not.toHaveBeenCalled()
    expectPrivate(response)
  })

  it("verifies TokenHash and issues a flow-and-subject-bound completion grant", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ version: 1, ok: true, outcome: "confirmed" })),
    )
    const { client } = installRouteClient()
    const pending = encodePendingEmailCallback({
      actionRef: "opaque-reference",
      next: "/auth/invite/complete",
      tokenHash: "invite-token-hash",
      type: "invite",
    })

    const response = await handleClinicDashboardEmailCallback(
      mutationRequest("/api/auth/callback", {}, [`clinic_dashboard_pending_email=${pending}`]),
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ redirectTo: "/auth/invite/complete" })
    expect(client.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "invite-token-hash",
      type: "invite",
    })
    expect(response.headers.get("set-cookie")).toContain("clinic_dashboard_completion_grant=")
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    expectPrivate(response)
  })

  it.each([
    ["invite", "clinic-invitation", "/auth/invite/complete"],
    ["recovery", "clinic-recovery", "/auth/password/reset/complete"],
  ] as const)(
    "resumes %s Website confirmation without consuming the token again",
    async (type, flow, next) => {
      const { client } = installRouteClient()
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(
          Response.json(
            { version: 1, ok: false, code: "AUTH_ACTION_TEMPORARILY_UNAVAILABLE" },
            { status: 503 },
          ),
        )
        .mockResolvedValueOnce(Response.json({ version: 1, ok: true, outcome: "confirmed" }))
      vi.stubGlobal("fetch", fetcher)
      vi.stubEnv(
        "AUTH_ACTION_PROTOCOL_SERVICE_KEYS_JSON",
        JSON.stringify({
          environment: "test",
          service: [{ version: "v1", secret: "test-service-key-0123456789abcdef0123456789" }], // pragma: allowlist secret - public synthetic fixture
        }),
      )
      const pending = encodePendingEmailCallback({
        actionRef: "opaque-reference",
        next,
        tokenHash: "synthetic",
        type,
      })
      const first = await handleClinicDashboardEmailCallback(
        mutationRequest("/api/auth/callback", {}, [`clinic_dashboard_pending_email=${pending}`]),
      )
      expect(first.status).toBe(503)
      const grant = first.cookies.get("clinic_dashboard_completion_grant")?.value
      expect(grant).toBeTruthy()
      client.auth.getClaims.mockRejectedValueOnce(new TypeError("Synthetic session verification failure"))
      const interrupted = await handleClinicDashboardEmailCallback(
        mutationRequest("/api/auth/callback", {}, [
          `clinic_dashboard_completion_grant=${grant}`,
          "clinic-dashboard-auth=session-cookie",
        ]),
      )
      expect(interrupted.status).toBe(503)
      await expect(interrupted.json()).resolves.toEqual({ code: "AUTH_TEMPORARILY_UNAVAILABLE" })
      expect(interrupted.headers.get("set-cookie")).not.toContain("clinic_dashboard_completion_grant=;")
      expect(interrupted.headers.get("set-cookie")).not.toContain("clinic-dashboard-auth=;")
      expect(fetcher).toHaveBeenCalledOnce()
      expect(client.auth.signOut).not.toHaveBeenCalled()
      const second = await handleClinicDashboardEmailCallback(
        mutationRequest("/api/auth/callback", {}, [
          `clinic_dashboard_completion_grant=${grant}`,
          "clinic-dashboard-auth=session-cookie",
        ]),
      )
      expect(second.status).toBe(200)
      await expect(second.json()).resolves.toEqual({ redirectTo: next })
      expect(client.auth.verifyOtp).toHaveBeenCalledOnce()
      expect(client.auth.signOut).not.toHaveBeenCalled()
      expect(fetcher).toHaveBeenLastCalledWith(
        new URL("https://preview.findmydoc.eu/api/internal/auth-actions/v1/confirmAction"),
        expect.objectContaining({
          body: JSON.stringify({
            actionRef: "opaque-reference",
            flow,
            accessToken: "server-access-token",
          }),
        }),
      )
    },
  )

  it("returns session-bound CSRF with the established cookies when Website confirmation fails", async () => {
    const { client } = installRouteClient()
    createRouteSupabaseClientMock.mockReturnValue({
      client,
      applyToResponse: (response: import("next/server").NextResponse) => {
        response.cookies.set("clinic-dashboard-auth", "renewed-synthetic-session", {
          httpOnly: true,
          path: "/",
        })
        return response
      },
    })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { version: 1, ok: false, code: "AUTH_ACTION_TEMPORARILY_UNAVAILABLE" },
          { status: 503 },
        ),
      ),
    )
    const pending = encodePendingEmailCallback({
      actionRef: "opaque-reference",
      next: "/auth/invite/complete",
      tokenHash: "synthetic",
      type: "invite",
    })
    const response = await handleClinicDashboardEmailCallback(
      mutationRequest("/api/auth/callback", {}, [`clinic_dashboard_pending_email=${pending}`]),
    )
    const token = response.cookies.get("clinic_dashboard_csrf")?.value
    const incoming = new NextRequest("http://localhost:3000/api/auth/callback", {
      headers: { cookie: "clinic-dashboard-auth=renewed-synthetic-session" },
    })
    expect(response.status).toBe(503)
    expect(isValidCsrfToken(incoming, token)).toBe(true)
  })

  it("retries the exact Website completion after uncertainty and signs out only on success", async () => {
    const { client } = installRouteClient()
    vi.stubEnv(
      "AUTH_ACTION_PROTOCOL_SERVICE_KEYS_JSON",
      JSON.stringify({
        environment: "test",
        service: [{ version: "v1", secret: "test-service-key-0123456789abcdef0123456789" }], // pragma: allowlist secret - public synthetic fixture
      }),
    )
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { version: 1, ok: false, code: "AUTH_ACTION_TEMPORARILY_UNAVAILABLE" },
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(Response.json({ version: 1, ok: true, outcome: "completed" }))
    vi.stubGlobal("fetch", fetcher)
    const grant = encodeCompletionGrant({
      actionRef: "opaque-reference",
      flow: "recovery",
      issuedAt: Math.floor(Date.now() / 1000),
      state: "confirmed",
      subject: "staff-1",
    })
    const body = { confirmPassword: "new-password", password: "new-password" }
    const first = await handleClinicDashboardPasswordCompletion(
      mutationRequest("/api/auth/password/reset/complete", body, [
        "clinic-dashboard-auth=session-cookie",
        `clinic_dashboard_completion_grant=${grant}`,
      ]),
      "recovery",
    )
    expect(first.status).toBe(503)
    expect(client.auth.updateUser).not.toHaveBeenCalled()
    expect(client.auth.signOut).not.toHaveBeenCalled()
    const retry = first.cookies.get("clinic_dashboard_completion_grant")?.value
    expect(retry).toBeTruthy()
    const stored = JSON.stringify(
      JSON.parse(Buffer.from(retry!.split(".")[0]!, "base64url").toString("utf8")),
    )
    expect(stored).not.toContain("new-password")
    expect(stored).not.toContain("server-access-token")
    const changed = await handleClinicDashboardPasswordCompletion(
      mutationRequest(
        "/api/auth/password/reset/complete",
        { confirmPassword: "changed-password", password: "changed-password" }, // pragma: allowlist secret - public synthetic fixture
        ["clinic-dashboard-auth=session-cookie", `clinic_dashboard_completion_grant=${retry}`],
      ),
      "recovery",
    )
    expect(changed.status).toBe(503)
    expect(fetcher).toHaveBeenCalledOnce()
    client.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "changed-synthetic-token" } },
      error: null,
    })
    const changedSession = await handleClinicDashboardPasswordCompletion(
      mutationRequest("/api/auth/password/reset/complete", body, [
        "clinic-dashboard-auth=session-cookie",
        `clinic_dashboard_completion_grant=${retry}`,
      ]),
      "recovery",
    )
    expect(changedSession.status).toBe(503)
    expect(fetcher).toHaveBeenCalledOnce()
    const second = await handleClinicDashboardPasswordCompletion(
      mutationRequest("/api/auth/password/reset/complete", body, [
        "clinic-dashboard-auth=session-cookie",
        `clinic_dashboard_completion_grant=${retry}`,
      ]),
      "recovery",
    )
    expect(second.status).toBe(200)
    await expect(second.json()).resolves.toEqual({ redirectTo: "/login?status=recovery-complete" })
    const firstWire = fetcher.mock.calls[0] as unknown as [URL, RequestInit]
    const retryWire = fetcher.mock.calls[1] as unknown as [URL, RequestInit]
    expect(firstWire[0]).toEqual(
      new URL("https://preview.findmydoc.eu/api/internal/auth-actions/v1/completeAction"),
    )
    expect(firstWire[1].body).toBe(
      JSON.stringify({
        actionRef: "opaque-reference",
        flow: "clinic-recovery",
        accessToken: "server-access-token",
        password: "new-password",
      }),
    )
    expect(retryWire[0]).toEqual(firstWire[0])
    expect(retryWire[1].body).toBe(firstWire[1].body)
    expect(retryWire[1].headers).toEqual(firstWire[1].headers)
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "global" })
  })

  it("does not create a new password attempt when the original five-minute request expires", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-04T03:00:00.000Z"))
    const { client } = installRouteClient()
    const fetcher = vi.fn(async () =>
      Response.json({ version: 1, ok: false, code: "AUTH_ACTION_TEMPORARILY_UNAVAILABLE" }, { status: 503 }),
    )
    vi.stubGlobal("fetch", fetcher)
    const grant = encodeCompletionGrant({
      actionRef: "opaque-reference",
      flow: "invite",
      issuedAt: Math.floor(Date.now() / 1000),
      state: "confirmed",
      subject: "staff-1",
    })
    const body = { confirmPassword: "new-password", password: "new-password" }
    const first = await handleClinicDashboardPasswordCompletion(
      mutationRequest("/api/auth/invite/complete", body, [`clinic_dashboard_completion_grant=${grant}`]),
      "invite",
    )
    vi.setSystemTime(new Date("2026-10-04T03:05:00.000Z"))
    const retry = first.cookies.get("clinic_dashboard_completion_grant")?.value
    const expired = await handleClinicDashboardPasswordCompletion(
      mutationRequest("/api/auth/invite/complete", body, [`clinic_dashboard_completion_grant=${retry}`]),
      "invite",
    )
    expect(expired.status).toBe(503)
    expect(fetcher).toHaveBeenCalledOnce()
    expect(client.auth.signOut).not.toHaveBeenCalled()
    expect(client.auth.updateUser).not.toHaveBeenCalled()
  })

  it.each(["invite", "recovery"] as const)(
    "rejects a mismatched %s subject before completion",
    async (flow) => {
      const { client } = installRouteClient()
      const grant = encodeCompletionGrant({
        actionRef: "opaque-reference",
        flow,
        issuedAt: Math.floor(Date.now() / 1000),
        state: "confirmed",
        subject: "another-subject",
      })
      const response = await handleClinicDashboardPasswordCompletion(
        mutationRequest(
          flow === "invite" ? "/api/auth/invite/complete" : "/api/auth/password/reset/complete",
          { confirmPassword: "new-password", password: "new-password" },
          [`clinic_dashboard_completion_grant=${grant}`],
        ),
        flow,
      )
      expect(response.status).toBe(401)
      await expect(response.json()).resolves.toEqual({ code: "INVALID_OR_EXPIRED_LINK" })
      expect(fetch).not.toHaveBeenCalled()
      expect(client.auth.updateUser).not.toHaveBeenCalled()
    },
  )

  it("rejects caller-selected recovery authority and missing CSRF before transport", async () => {
    const extra = await handleClinicDashboardPasswordResetRequest(
      mutationRequest("/api/auth/password/reset", {
        email: "synthetic@example.invalid",
        next: "/other",
        clientIP: "192.0.2.1",
      }),
    )
    expect(extra.status).toBe(400)
    const noCsrf = await handleClinicDashboardEmailCallback(
      new NextRequest("http://localhost:3000/api/auth/callback", {
        method: "POST",
        body: "{}",
        headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      }),
    )
    expect(noCsrf.status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
    expect(createRouteSupabaseClientMock).not.toHaveBeenCalled()
  })

  it("completes through the Website with a matching grant and clears local state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ version: 1, ok: true, outcome: "completed" })),
    )
    const { client } = installRouteClient()
    const grant = encodeCompletionGrant({
      actionRef: "opaque-reference",
      state: "confirmed",
      flow: "recovery",
      issuedAt: Math.floor(Date.now() / 1000),
      subject: "staff-1",
    })
    const response = await handleClinicDashboardPasswordCompletion(
      mutationRequest(
        "/api/auth/password/reset/complete",
        { confirmPassword: "new-password", password: "new-password" },
        ["clinic-dashboard-auth=session-cookie", `clinic_dashboard_completion_grant=${grant}`],
      ),
      "recovery",
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      redirectTo: "/login?status=recovery-complete",
    })
    expect(client.auth.updateUser).not.toHaveBeenCalled()
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "global" })
    expect(response.headers.get("set-cookie")).toContain("clinic_dashboard_completion_grant=;")
    expect(response.headers.get("set-cookie")).toContain("clinic-dashboard-auth=;")
    expectPrivate(response)
  })

  it.each(["invite", "recovery"] as const)(
    "allows %s password completion while clinic onboarding is pending",
    async (flow) => {
      const fetcher = vi.fn(async () => Response.json({ version: 1, ok: true, outcome: "completed" }))
      vi.stubGlobal("fetch", fetcher)
      const { client } = installRouteClient()
      const grant = encodeCompletionGrant({
        actionRef: "opaque-reference",
        state: "confirmed",
        flow,
        issuedAt: Math.floor(Date.now() / 1000),
        subject: "staff-1",
      })
      const path = flow === "invite" ? "/api/auth/invite/complete" : "/api/auth/password/reset/complete"

      const response = await handleClinicDashboardPasswordCompletion(
        mutationRequest(path, { confirmPassword: "new-password", password: "new-password" }, [
          "clinic-dashboard-auth=session-cookie",
          `clinic_dashboard_completion_grant=${grant}`,
        ]),
        flow,
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        redirectTo: `/login?status=${flow}-complete`,
      })
      expect(client.auth.updateUser).not.toHaveBeenCalled()
      expect(client.auth.refreshSession).not.toHaveBeenCalled()
      expect(client.auth.signOut).toHaveBeenCalledWith({
        scope: flow === "recovery" ? "global" : "local",
      })
      expect(fetcher).toHaveBeenCalledOnce()
      expectPrivate(response)
      expect(fetcher).toHaveBeenCalledWith(
        new URL("https://preview.findmydoc.eu/api/internal/auth-actions/v1/completeAction"),
        expect.objectContaining({
          body: JSON.stringify({
            actionRef: "opaque-reference",
            flow: flow === "invite" ? "clinic-invitation" : "clinic-recovery",
            accessToken: "server-access-token",
            password: "new-password",
          }),
          method: "POST",
          cache: "no-store",
        }),
      )
    },
  )

  it("logs out locally and propagates private response headers", async () => {
    const { client } = installRouteClient()
    const response = await handleClinicDashboardLogout(
      mutationRequest("/api/auth/logout", {}, ["clinic-dashboard-auth=session-cookie"]),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ redirectTo: "/login" })
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" })
    expect(response.headers.get("set-cookie")).toContain("clinic-dashboard-auth=;")
    expectPrivate(response)
  })
})
