import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createPayloadClinicTreatmentProvider } from "@/features/clinic-dashboard/clinic-profile/server/payload-clinic-treatments"

const treatment = {
  descriptionText: "Central treatment description.",
  id: "treatment-1",
  name: "Treatment One",
}
const offering = {
  active: false,
  id: "offering-1",
  priceEUR: 0,
  revision: "2026-08-13T10:00:00.000Z",
  treatment,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  })
}

describe("Clinic treatment Payload adapter", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "test-only-csrf-signing-secret-value")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("loads the focused server-derived treatment contract without a clinic identifier", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({ catalogue: [treatment], offerings: [offering] }),
    )
    const provider = createPayloadClinicTreatmentProvider("access-token", "clinic-1", fetcher)

    await expect(provider.loadTreatments()).resolves.toEqual({
      ok: true,
      value: {
        catalogue: [treatment],
        offerings: [
          {
            active: false,
            id: "offering-1",
            price: 0,
            revision: offering.revision,
            treatment,
          },
        ],
        status: "ready",
      },
    })

    const [input, init] = fetcher.mock.calls[0]
    expect(String(input)).toBe("https://preview.findmydoc.eu/api/clinic-dashboard/treatments")
    expect(init).toMatchObject({ cache: "no-store", redirect: "error" })
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer access-token")
  })

  it("creates treatments through the focused contract without caller-controlled active state", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.method).toBe("POST")
      expect(JSON.parse(String(init?.body))).toEqual({ priceEUR: 12.34, treatmentId: "treatment-1" })
      return jsonResponse({ ...offering, priceEUR: 12.34 }, 201)
    })
    const provider = createPayloadClinicTreatmentProvider("access-token", "clinic-1", fetcher)

    await expect(provider.createTreatment({ price: 12.34, treatmentId: "treatment-1" })).resolves.toEqual({
      ok: true,
      value: {
        active: false,
        id: "offering-1",
        price: 12.34,
        revision: offering.revision,
        treatment,
      },
    })
  })

  it("updates against the expected revision and maps conflicts", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.method).toBe("PATCH")
      expect(JSON.parse(String(init?.body))).toEqual({
        active: true,
        expectedRevision: offering.revision,
        offeringId: "offering-1",
        priceEUR: 12.34,
      })
      return jsonResponse({ ...offering, active: true, priceEUR: 12.34 })
    })
    const provider = createPayloadClinicTreatmentProvider("access-token", "clinic-1", fetcher)

    await expect(
      provider.updateTreatment("offering-1", {
        active: true,
        expectedRevision: offering.revision,
        price: 12.34,
      }),
    ).resolves.toMatchObject({ ok: true, value: { active: true, price: 12.34 } })

    const conflictProvider = createPayloadClinicTreatmentProvider(
      "access-token",
      "clinic-1",
      vi.fn(async () => jsonResponse({}, 409)),
    )
    await expect(
      conflictProvider.updateTreatment("offering-1", {
        active: true,
        expectedRevision: offering.revision,
        price: 12.34,
      }),
    ).resolves.toEqual({ error: "conflict", ok: false })
  })

  it("fails closed for malformed focused-contract responses", async () => {
    const provider = createPayloadClinicTreatmentProvider(
      "access-token",
      "clinic-1",
      vi.fn(async () => jsonResponse({ docs: [offering] })),
    )

    await expect(provider.loadTreatments()).resolves.toEqual({
      error: "temporarily-unavailable",
      ok: false,
    })
  })
})
