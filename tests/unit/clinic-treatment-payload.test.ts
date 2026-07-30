import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createPayloadClinicTreatmentProvider,
  extractTreatmentDescriptionText,
} from "@/features/clinic-dashboard/clinic-profile/server/payload-clinic-treatments"

const treatment = {
  description: {
    root: {
      children: [{ children: [{ text: "Central treatment" }] }, { children: [{ text: "description." }] }],
    },
  },
  id: "treatment-1",
  name: "Treatment One",
}
const offering = {
  active: false,
  clinic: { id: "clinic-1" },
  id: "offering-1",
  price: 0,
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
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
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

  it("loads only the server-derived clinic and projects plain central descriptions", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input))
      if (url.pathname === "/api/clinictreatments") return jsonResponse({ docs: [offering] })
      if (url.pathname === "/api/treatments") return jsonResponse({ docs: [treatment] })
      return jsonResponse({}, 404)
    })
    const provider = createPayloadClinicTreatmentProvider("access-token", "clinic-1", fetcher)

    await expect(provider.loadTreatments()).resolves.toEqual({
      ok: true,
      value: {
        catalogue: [
          {
            descriptionText: "Central treatment description.",
            id: "treatment-1",
            name: "Treatment One",
          },
        ],
        offerings: [
          {
            active: false,
            id: "offering-1",
            price: 0,
            treatment: {
              descriptionText: "Central treatment description.",
              id: "treatment-1",
              name: "Treatment One",
            },
          },
        ],
        status: "ready",
      },
    })

    const offeringRequest = fetcher.mock.calls.find(([input]) =>
      String(input).includes("/api/clinictreatments?"),
    )
    const offeringUrl = new URL(String(offeringRequest?.[0]))
    expect(offeringUrl.searchParams.get("where[clinic][equals]")).toBe("clinic-1")
    expect(offeringRequest?.[1]).toMatchObject({ cache: "no-store" })
  })

  it("adds the clinic identity server-side and detects duplicates before create", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input))
      if (!init?.method) return jsonResponse({ docs: [] })
      expect(JSON.parse(String(init.body))).toEqual({
        active: true,
        clinic: 7,
        price: 12.34,
        treatment: 8,
      })
      return jsonResponse({ doc: { ...offering, active: true, clinic: 7, price: 12.34 } }, 201)
    })
    const provider = createPayloadClinicTreatmentProvider("access-token", "7", fetcher)

    await expect(
      provider.createTreatment({ active: true, price: 12.34, treatmentId: "8" }),
    ).resolves.toMatchObject({ ok: true, value: { active: true, price: 12.34 } })

    const duplicateProvider = createPayloadClinicTreatmentProvider(
      "access-token",
      "clinic-1",
      vi.fn(async () => jsonResponse({ docs: [offering] })),
    )
    await expect(
      duplicateProvider.createTreatment({ active: false, price: 0, treatmentId: "treatment-1" }),
    ).resolves.toEqual({ error: "conflict", ok: false })
  })

  it("fails closed when Payload returns another clinic", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input))
      return url.pathname === "/api/treatments"
        ? jsonResponse({ docs: [treatment] })
        : jsonResponse({ docs: [{ ...offering, clinic: { id: "clinic-2" } }] })
    })
    const provider = createPayloadClinicTreatmentProvider("access-token", "clinic-1", fetcher)

    await expect(provider.loadTreatments()).resolves.toEqual({
      error: "temporarily-unavailable",
      ok: false,
    })
  })

  it("extracts text without leaking rich-text markup", () => {
    expect(extractTreatmentDescriptionText(treatment.description)).toBe("Central treatment description.")
  })
})
