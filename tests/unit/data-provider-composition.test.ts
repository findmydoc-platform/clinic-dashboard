import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { composeClinicDashboardDataProviders } from "@/features/clinic-dashboard/data-provider-composition"

const localEnvironment = {
  CSRF_SIGNING_SECRET: "0123456789abcdef0123456789abcdef", // pragma: allowlist secret
  DASHBOARD_ORIGIN: "http://localhost:3000",
  EXPECTED_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
  NODE_ENV: "test",
  PAYLOAD_API_URL: "https://preview.findmydoc.eu",
  SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
} as const

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  })
}

describe("Clinic Dashboard data provider composition", () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(localEnvironment)) {
      vi.stubEnv(key, value)
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("selects the deterministic inquiry adapter for a verified controlled session", async () => {
    vi.stubEnv("CLINIC_DASHBOARD_AUTH_TEST_MODE", "controlled")
    vi.stubEnv("CLINIC_DASHBOARD_TEST_PASSWORD", "test-password") // pragma: allowlist secret
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)

    const result = await composeClinicDashboardDataProviders(
      "controlled-access-token",
      "controlled-clinic",
    ).inquiries.loadQueue()

    expect(result).toMatchObject({
      ok: true,
      value: {
        inquiries: [{ id: "inquiry-lukas-weber", status: "submitted" }],
      },
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("selects the Payload inquiry adapter outside controlled mode", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse({ docs: [] }))
    vi.stubGlobal("fetch", fetcher)

    await expect(
      composeClinicDashboardDataProviders("access-token", "clinic-1").inquiries.loadQueue(),
    ).resolves.toEqual({
      ok: true,
      value: { inquiries: [], status: "ready" },
    })
    expect(String(fetcher.mock.calls[0]?.[0])).toContain(
      "https://preview.findmydoc.eu/api/patientClinicInquiries",
    )
  })

  it("requires a verified request-scoped access token", () => {
    expect(() => composeClinicDashboardDataProviders("", "clinic-1")).toThrow(/verified clinic access token/)
    expect(() => composeClinicDashboardDataProviders("access-token", "")).toThrow(/verified clinic identity/)
  })

  it.each([
    [
      "preview",
      {
        ...localEnvironment,
        CLINIC_DASHBOARD_AUTH_TEST_MODE: "controlled",
        CLINIC_DASHBOARD_TEST_PASSWORD: "test-password", // pragma: allowlist secret
        DASHBOARD_ORIGIN: "https://clinics.preview.findmydoc.eu",
        VERCEL_ENV: "preview",
      },
    ],
    [
      "production",
      {
        ...localEnvironment,
        CLINIC_DASHBOARD_AUTH_TEST_MODE: "controlled",
        CLINIC_DASHBOARD_TEST_PASSWORD: "test-password", // pragma: allowlist secret
        DASHBOARD_ORIGIN: "https://clinics.findmydoc.eu",
        EXPECTED_SUPABASE_PROJECT_REF: "zyxwvutsrqponmlkjihg",
        NODE_ENV: "production",
        PAYLOAD_API_URL: "https://findmydoc.eu",
        SUPABASE_URL: "https://zyxwvutsrqponmlkjihg.supabase.co",
        VERCEL_ENV: "production",
      },
    ],
  ] as const)("rejects controlled inquiry data in %s", (_name, environment) => {
    expect(() => composeClinicDashboardDataProviders("access-token", "clinic-1", environment)).toThrow(
      /Controlled authentication/,
    )
  })
})
