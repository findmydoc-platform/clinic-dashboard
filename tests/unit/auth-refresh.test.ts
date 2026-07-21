import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { resolveMutableClinicDashboardAccess } from "@/features/clinic-dashboard/auth/server/access"

function response(status: number, code: string) {
  return new Response(JSON.stringify({ code }), {
    headers: { "cache-control": "private, no-store", vary: "Authorization" },
    status,
  })
}

function createClient() {
  const getClaims = vi.fn(async () => ({
    data: { claims: { app_metadata: { user_type: "clinic" }, email: "alex@example.com", sub: "staff-1" } },
    error: null,
  }))
  const getSession = vi.fn(async () => ({
    data: { session: { access_token: "access-token" } },
    error: null,
  }))
  const refreshSession = vi.fn(async () => ({ data: { session: {} }, error: null }))
  const signOut = vi.fn(async () => ({ error: null }))
  return {
    auth: { getClaims, getSession, refreshSession, signOut },
  }
}

describe("bootstrap session refresh", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://staging-project.supabase.co")
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
})
