import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { resolveMutableClinicDashboardAccess } from "@/features/clinic-dashboard/auth/server/access"

function response(status: number, code: string) {
  return new Response(JSON.stringify({ error: { code } }), {
    headers: { "cache-control": "private, no-store", vary: "Authorization" },
    status,
  })
}

function createClient() {
  const getClaims = vi.fn(async () => ({
    data: { claims: { app_metadata: { user_type: "clinic" }, email: "alex@example.com", sub: "staff-1" } },
    error: null,
  }))
  const getSession = vi.fn<
    () => Promise<{
      data: { session: { access_token: string } | null }
      error: Error | null
    }>
  >(async () => ({
    data: { session: { access_token: "initial-access-token" } },
    error: null,
  }))
  getSession
    .mockResolvedValueOnce({
      data: { session: { access_token: "initial-access-token" } },
      error: null,
    })
    .mockResolvedValue({
      data: { session: { access_token: "refreshed-access-token" } },
      error: null,
    })
  const refreshSession = vi.fn<
    () => Promise<{
      data: { session: Record<string, unknown> | null }
      error: Error | null
    }>
  >(async () => ({ data: { session: {} }, error: null }))
  const signOut = vi.fn(async () => ({ error: null }))
  return {
    auth: { getClaims, getSession, refreshSession, signOut },
  }
}

describe("bootstrap session refresh", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("refreshes and retries exactly once after a Payload 401", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(401, "CLINIC_DASHBOARD_UNAUTHORIZED"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            capabilities: ["clinic-profile:view", "clinic-profile:edit"],
            clinic: { id: "clinic-1", name: "Clinic One" },
            principal: { displayName: "Alex", email: "alex@example.com", id: "staff-1" },
            status: "approved",
          }),
          { headers: { "cache-control": "private, no-store", vary: "Authorization" } },
        ),
      )
    vi.stubGlobal("fetch", fetcher)
    const client = createClient()

    await expect(resolveMutableClinicDashboardAccess(client as never)).resolves.toMatchObject({
      status: "approved",
    })
    expect(client.auth.refreshSession).toHaveBeenCalledOnce()
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer initial-access-token",
    })
    expect(fetcher.mock.calls[1]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer refreshed-access-token",
    })
    expect(client.auth.signOut).not.toHaveBeenCalled()
  })

  it("clears the local session after the second 401", async () => {
    const fetcher = vi.fn(async () => response(401, "CLINIC_DASHBOARD_UNAUTHORIZED"))
    vi.stubGlobal("fetch", fetcher)
    const client = createClient()

    await expect(resolveMutableClinicDashboardAccess(client as never)).resolves.toEqual({
      status: "unauthenticated",
    })
    expect(client.auth.refreshSession).toHaveBeenCalledOnce()
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" })
  })

  it.each([
    [403, "CLINIC_DASHBOARD_ACCESS_DENIED", "denied"],
    [503, "CLINIC_DASHBOARD_TEMPORARILY_UNAVAILABLE", "temporarily-unavailable"],
  ] as const)("preserves the session for Payload %s", async (status, code, expectedStatus) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response(status, code)),
    )
    const client = createClient()
    await expect(resolveMutableClinicDashboardAccess(client as never)).resolves.toEqual({
      status: expectedStatus,
    })
    expect(client.auth.refreshSession).not.toHaveBeenCalled()
    expect(client.auth.signOut).not.toHaveBeenCalled()
  })

  it("clears the local session when refresh fails", async () => {
    const fetcher = vi.fn(async () => response(401, "CLINIC_DASHBOARD_UNAUTHORIZED"))
    vi.stubGlobal("fetch", fetcher)
    const client = createClient()
    client.auth.refreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error("refresh failed"),
    })

    await expect(resolveMutableClinicDashboardAccess(client as never)).resolves.toEqual({
      status: "unauthenticated",
    })
    expect(fetcher).toHaveBeenCalledOnce()
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" })
  })

  it("clears the local session when refresh yields no verified session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response(401, "CLINIC_DASHBOARD_UNAUTHORIZED")),
    )
    const client = createClient()
    client.auth.getSession.mockReset()
    client.auth.getSession
      .mockResolvedValueOnce({
        data: { session: { access_token: "initial-access-token" } },
        error: null,
      })
      .mockResolvedValueOnce({ data: { session: null }, error: null })

    await expect(resolveMutableClinicDashboardAccess(client as never)).resolves.toEqual({
      status: "unauthenticated",
    })
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" })
  })

  it("maps a refreshed non-clinic account without retrying Payload", async () => {
    const fetcher = vi.fn(async () => response(401, "CLINIC_DASHBOARD_UNAUTHORIZED"))
    vi.stubGlobal("fetch", fetcher)
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
            app_metadata: { user_type: "patient" },
            email: "alex@example.com",
            sub: "staff-1",
          },
        },
        error: null,
      })

    await expect(resolveMutableClinicDashboardAccess(client as never)).resolves.toEqual({
      status: "unauthorized",
    })
    expect(fetcher).toHaveBeenCalledOnce()
    expect(client.auth.signOut).not.toHaveBeenCalled()
  })
})
