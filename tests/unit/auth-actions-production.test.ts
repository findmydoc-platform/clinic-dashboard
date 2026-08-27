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
import { createCsrfToken } from "@/lib/security/csrf"
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
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => approvedBootstrapResponse()),
    )
  })

  afterEach(() => {
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

  it("keeps password reset responses neutral when Supabase fails", async () => {
    const { client } = installRouteClient()
    client.auth.resetPasswordForEmail.mockRejectedValueOnce(new Error("provider unavailable"))

    const response = await handleClinicDashboardPasswordResetRequest(
      mutationRequest("/api/auth/password/reset", { email: "unknown@example.com" }),
    )
    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({ accepted: true })
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "unknown@example.com",
      expect.objectContaining({
        redirectTo: "http://localhost:3000/auth/callback?next=%2Fauth%2Fpassword%2Freset%2Fcomplete",
      }),
    )
    expectPrivate(response)
  })

  it.each([
    "https://clinics.preview.findmydoc.eu",
    "https://clinic-dashboard-5gepqbsiw-findmydoc.vercel.app",
  ])("keeps the password reset callback on trusted preview origin %s", async (origin) => {
    vi.stubEnv("DASHBOARD_ORIGIN", "https://clinics.preview.findmydoc.eu")
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_URL", "clinic-dashboard-5gepqbsiw-findmydoc.vercel.app")
    const { client } = installRouteClient()

    const response = await handleClinicDashboardPasswordResetRequest(
      mutationRequest("/api/auth/password/reset", { email: "alex@example.com" }, [], origin),
    )

    expect(response.status).toBe(202)
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith("alex@example.com", {
      redirectTo: `${origin}/auth/callback?next=%2Fauth%2Fpassword%2Freset%2Fcomplete`,
    })
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
    const { client } = installRouteClient()
    const pending = encodePendingEmailCallback({
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

  it("updates the password only with a matching grant and clears all local state", async () => {
    const { client } = installRouteClient()
    const grant = encodeCompletionGrant({
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
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: "new-password" })
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "global" })
    expect(response.headers.get("set-cookie")).toContain("clinic_dashboard_completion_grant=;")
    expect(response.headers.get("set-cookie")).toContain("clinic-dashboard-auth=;")
    expectPrivate(response)
  })

  it.each(["invite", "recovery"] as const)(
    "allows %s password completion while clinic onboarding is pending",
    async (flow) => {
      const fetcher = vi.fn(async () => deniedBootstrapResponse())
      vi.stubGlobal("fetch", fetcher)
      const { client } = installRouteClient()
      const grant = encodeCompletionGrant({
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
      expect(client.auth.updateUser).toHaveBeenCalledWith({ password: "new-password" })
      expect(client.auth.refreshSession).not.toHaveBeenCalled()
      expect(client.auth.signOut).toHaveBeenCalledWith({
        scope: flow === "recovery" ? "global" : "local",
      })
      expect(fetcher).toHaveBeenCalledOnce()
      expectPrivate(response)
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
