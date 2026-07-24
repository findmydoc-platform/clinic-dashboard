import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchClinicDashboardBootstrap } from "@/features/clinic-dashboard/auth/server/payload-bootstrap"

const bootstrap = {
  capabilities: ["clinic-profile:view", "clinic-profile:edit"],
  clinic: { id: "clinic-1", name: "Clinic One" },
  principal: { displayName: "Alex Morgan", email: "alex@example.com", id: "staff-1" },
  status: "approved",
} as const

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/json",
      vary: "Authorization",
      ...headers,
    },
    status,
  })
}

describe("Payload clinic bootstrap", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
  })

  afterEach(() => vi.unstubAllEnvs())

  it("sends only the bearer token to the configured HTTPS bootstrap endpoint", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse(bootstrap))
    await expect(fetchClinicDashboardBootstrap("access-token", fetcher)).resolves.toEqual({
      context: bootstrap,
      status: "approved",
    })

    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(String(url)).toBe("https://preview.findmydoc.eu/api/clinic-dashboard/bootstrap")
    expect(init).toMatchObject({
      cache: "no-store",
      headers: { Accept: "application/json", Authorization: "Bearer access-token" },
      redirect: "error",
    })
  })

  it.each([
    [401, "CLINIC_DASHBOARD_UNAUTHORIZED", "unauthorized"],
    [403, "CLINIC_DASHBOARD_ACCESS_DENIED", "denied"],
    [503, "CLINIC_DASHBOARD_TEMPORARILY_UNAVAILABLE", "temporarily-unavailable"],
  ] as const)("maps %s with its exact code", async (status, code, expectedStatus) => {
    const fetcher = vi.fn(async () => jsonResponse({ code }, status))
    await expect(fetchClinicDashboardBootstrap("access-token", fetcher as typeof fetch)).resolves.toEqual({
      status: expectedStatus,
    })
  })

  it("fails closed for malformed DTOs, error codes, cache headers, and redirects", async () => {
    const malformed = { ...bootstrap, capabilities: [...bootstrap.capabilities].reverse() }
    await expect(
      fetchClinicDashboardBootstrap("token", vi.fn(async () => jsonResponse(malformed)) as typeof fetch),
    ).resolves.toEqual({ status: "temporarily-unavailable" })
    await expect(
      fetchClinicDashboardBootstrap(
        "token",
        vi.fn(async () => jsonResponse({ code: "OTHER" }, 401)) as typeof fetch,
      ),
    ).resolves.toEqual({ status: "temporarily-unavailable" })
    await expect(
      fetchClinicDashboardBootstrap(
        "token",
        vi.fn(async () => jsonResponse(bootstrap, 200, { "cache-control": "public" })) as typeof fetch,
      ),
    ).resolves.toEqual({ status: "temporarily-unavailable" })
    await expect(
      fetchClinicDashboardBootstrap(
        "token",
        vi.fn(async () => Promise.reject(new Error("redirect"))) as typeof fetch,
      ),
    ).resolves.toEqual({ status: "temporarily-unavailable" })
  })
})
