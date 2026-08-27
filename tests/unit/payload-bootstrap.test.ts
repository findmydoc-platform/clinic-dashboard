import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchClinicDashboardBootstrap } from "@/features/clinic-dashboard/auth/server/payload-bootstrap"

const bootstrap = {
  capabilities: [
    "clinic-profile:view",
    "clinic-profile:edit",
    "clinic-treatments:view",
    "clinic-treatments:edit",
  ],
  clinic: { id: "clinic-1", name: "Clinic One" },
  principal: { displayName: "Alex Morgan", email: "alex@example.com", id: "staff-1" },
  status: "approved",
} as const

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/json",
      vary: "Authorization, X-Findmydoc-Clinic-Dashboard-Contract",
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

  it("opts into the inquiry contract at the configured HTTPS bootstrap endpoint", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse(bootstrap))
    await expect(fetchClinicDashboardBootstrap("access-token", fetcher)).resolves.toEqual({
      context: bootstrap,
      status: "approved",
    })

    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(String(url)).toBe("https://preview.findmydoc.eu/api/clinic-dashboard/bootstrap")
    expect(init).toMatchObject({
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer access-token",
        "X-Findmydoc-Clinic-Dashboard-Contract": "inquiry-communication-v2",
      },
      redirect: "error",
    })
  })

  it("binds the controlled local acceptance session to the seeded clinic without network bootstrap", async () => {
    vi.stubEnv("CLINIC_DASHBOARD_AUTH_TEST_MODE", "controlled")
    vi.stubEnv("CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_CLINIC_ID", "clinic-acceptance")
    vi.stubEnv("CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_CLINIC_NAME", "Synthetic Acceptance Clinic")
    vi.stubEnv("CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_MODE", "inquiry-communication")
    vi.stubEnv("CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_TOKEN", "synthetic-clinic-token")
    vi.stubEnv("CLINIC_DASHBOARD_TEST_PASSWORD", "test-password")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "http://127.0.0.1:3200")
    const fetcher = vi.fn<typeof fetch>()

    await expect(fetchClinicDashboardBootstrap("synthetic-clinic-token", fetcher)).resolves.toMatchObject({
      context: {
        clinic: { id: "clinic-acceptance", name: "Synthetic Acceptance Clinic" },
      },
      status: "approved",
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("does not infer treatment access from profile capabilities", async () => {
    const profileOnlyBootstrap = {
      ...bootstrap,
      capabilities: ["clinic-profile:view", "clinic-profile:edit"],
    }

    await expect(
      fetchClinicDashboardBootstrap(
        "access-token",
        vi.fn(async () => jsonResponse(profileOnlyBootstrap)) as typeof fetch,
      ),
    ).resolves.toEqual({
      context: profileOnlyBootstrap,
      status: "approved",
    })
  })

  it("preserves an explicit read-only treatment capability", async () => {
    const readOnlyTreatmentsBootstrap = {
      ...bootstrap,
      capabilities: ["clinic-profile:view", "clinic-profile:edit", "clinic-treatments:view"],
    }

    await expect(
      fetchClinicDashboardBootstrap(
        "access-token",
        vi.fn(async () => jsonResponse(readOnlyTreatmentsBootstrap)) as typeof fetch,
      ),
    ).resolves.toEqual({
      context: readOnlyTreatmentsBootstrap,
      status: "approved",
    })
  })

  it.each([
    [401, "CLINIC_DASHBOARD_UNAUTHORIZED", "unauthorized"],
    [403, "CLINIC_DASHBOARD_ACCESS_DENIED", "denied"],
    [503, "CLINIC_DASHBOARD_TEMPORARILY_UNAVAILABLE", "temporarily-unavailable"],
  ] as const)("maps %s with its exact code", async (status, code, expectedStatus) => {
    const fetcher = vi.fn(async () => jsonResponse({ error: { code } }, status))
    await expect(fetchClinicDashboardBootstrap("access-token", fetcher as typeof fetch)).resolves.toEqual({
      status: expectedStatus,
    })
  })

  it.each([
    [{ code: "CLINIC_DASHBOARD_ACCESS_DENIED" }, 403],
    [{ error: {} }, 403],
    [{ error: { code: 403 } }, 403],
    [{ error: { code: "OTHER" } }, 403],
  ] as const)("fails closed for an invalid error response %#", async (body, status) => {
    const fetcher = vi.fn(async () => jsonResponse(body, status))
    await expect(fetchClinicDashboardBootstrap("token", fetcher as typeof fetch)).resolves.toEqual({
      status: "temporarily-unavailable",
    })
  })

  it("fails closed for malformed DTOs, cache headers, and network errors", async () => {
    const malformed = { ...bootstrap, capabilities: ["clinic-profile:view", "clinic-profile:view"] }
    await expect(
      fetchClinicDashboardBootstrap("token", vi.fn(async () => jsonResponse(malformed)) as typeof fetch),
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
        vi.fn(async () => jsonResponse(bootstrap, 200, { vary: "Authorization" })) as typeof fetch,
      ),
    ).resolves.toEqual({ status: "temporarily-unavailable" })
    await expect(
      fetchClinicDashboardBootstrap(
        "token",
        vi.fn(async () => Promise.reject(new Error("redirect"))) as typeof fetch,
      ),
    ).resolves.toEqual({ status: "temporarily-unavailable" })
  })

  it.each([
    { capabilities: [] },
    { capabilities: ["clinic-profile:view"] },
    { capabilities: ["clinic-profile:edit"] },
    { capabilities: ["clinic-treatments:view"] },
    { capabilities: ["clinic-treatments:edit"] },
    { capabilities: ["clinic-profile:edit", "clinic-profile:view"] },
    {
      capabilities: [
        "clinic-profile:view",
        "clinic-profile:edit",
        "clinic-treatments:view",
        "clinic-treatments:edit",
      ],
    },
  ] as const)("accepts the independent capability subset %#", async ({ capabilities }) => {
    const context = { ...bootstrap, capabilities }
    await expect(
      fetchClinicDashboardBootstrap("token", vi.fn(async () => jsonResponse(context)) as typeof fetch),
    ).resolves.toEqual({ context, status: "approved" })
  })
})
