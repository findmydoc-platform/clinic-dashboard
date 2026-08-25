import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { composeClinicDashboardDataProviders } from "@/features/clinic-dashboard/data-provider-composition"
import { resetControlledPatientInquiryProvider } from "@/features/clinic-dashboard/messages/server/controlled-inquiries"

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

const clinicProfileSnapshot = {
  availableCities: [{ id: "city-istanbul", name: "Istanbul" }],
  published: {
    address: {
      city: { id: "city-istanbul", name: "Istanbul" },
      country: { code: "TR", name: "Türkiye" },
      houseNumber: "12",
      street: "Bağdat Avenue",
      zipCode: "00123",
    },
    descriptionText: "Clinic overview.",
    name: "Clinic One",
    revision: 1,
    supportedLanguages: ["english"],
  },
} as const

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
    resetControlledPatientInquiryProvider()
  })

  it("selects the deterministic inquiry adapter for a verified controlled session", async () => {
    vi.stubEnv("CLINIC_DASHBOARD_AUTH_TEST_MODE", "controlled")
    vi.stubEnv("CLINIC_DASHBOARD_TEST_PASSWORD", "test-password") // pragma: allowlist secret
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)

    const result = await composeClinicDashboardDataProviders(
      "controlled-access-token",
      "controlled-clinic",
    ).inquiries.loadQueue({ lifecycle: "open", unreadOnly: false })

    expect(result).toMatchObject({
      ok: true,
      value: {
        inquiries: expect.arrayContaining([expect.objectContaining({ id: "inquiry-lukas-weber" })]),
      },
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("selects the Payload inquiry adapter outside controlled mode", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        changeCursor: "change-0",
        items: [],
        unchanged: false,
        unreadCount: 0,
      }),
    )
    vi.stubGlobal("fetch", fetcher)

    await expect(
      composeClinicDashboardDataProviders("access-token", "clinic-1").inquiries.loadQueue({
        lifecycle: "open",
        unreadOnly: false,
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        changeCursor: "change-0",
        inquiries: [],
        status: "ready",
        unchanged: false,
        unreadCount: 0,
      },
    })
    expect(String(fetcher.mock.calls[0]?.[0])).toContain(
      "https://preview.findmydoc.eu/api/clinic-dashboard/inquiries",
    )
  })

  it("selects the deterministic source-backed clinic profile in controlled mode", async () => {
    vi.stubEnv("CLINIC_DASHBOARD_AUTH_TEST_MODE", "controlled")
    vi.stubEnv("CLINIC_DASHBOARD_TEST_PASSWORD", "test-password") // pragma: allowlist secret
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)

    const result = await composeClinicDashboardDataProviders(
      "controlled-access-token",
      "controlled-clinic",
    ).profile.loadSnapshot()

    expect(result).toMatchObject({
      ok: true,
      value: {
        draft: undefined,
        published: { name: "Controlled Bosphorus Clinic", revision: 1 },
      },
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("selects the Payload clinic profile adapter outside controlled mode", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify(clinicProfileSnapshot), {
          headers: {
            "cache-control": "private, no-store",
            "content-type": "application/json",
            vary: "Authorization",
          },
        }),
    )
    vi.stubGlobal("fetch", fetcher)

    await expect(
      composeClinicDashboardDataProviders("access-token", "clinic-1").profile.loadSnapshot(),
    ).resolves.toEqual({ ok: true, value: clinicProfileSnapshot })
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "https://preview.findmydoc.eu/api/clinic-dashboard/profile",
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
