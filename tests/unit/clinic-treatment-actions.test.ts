import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  handleClinicTreatmentCreate,
  handleClinicTreatmentRead,
  handleClinicTreatmentUpdate,
} from "@/features/clinic-dashboard/clinic-profile/server/public"
import type { ClinicTreatmentProviderFactory } from "@/features/clinic-dashboard/clinic-profile/server/clinic-treatment-provider"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

const providerMocks = vi.hoisted(() => ({
  createTreatment: vi.fn(),
  loadTreatments: vi.fn(),
  updateTreatment: vi.fn(),
}))
const createProvider = vi.fn(
  (_: string, __: string) => providerMocks,
) satisfies ClinicTreatmentProviderFactory
const offering = {
  active: false,
  id: "offering-1",
  price: 0,
  treatment: {
    descriptionText: "Central description.",
    id: "treatment-1",
    name: "Treatment One",
  },
} as const

function request(method: "GET" | "PATCH" | "POST", body?: unknown, offeringId?: string) {
  const endpoint = new URL("http://localhost:3000/api/dashboard/clinic-treatments")
  if (offeringId) endpoint.searchParams.set("offeringId", offeringId)
  const init = {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    method,
  }
  const base = new NextRequest(endpoint, init)
  const token = createCsrfToken(base)
  return new NextRequest(endpoint, {
    ...init,
    headers: {
      ...init.headers,
      cookie: `clinic_dashboard_csrf=${token}; clinic_dashboard_controlled_session=controlled-clinic-staff`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
    },
  })
}

describe("Clinic treatment BFF", () => {
  beforeEach(() => {
    vi.stubEnv("CLINIC_DASHBOARD_AUTH_TEST_MODE", "controlled")
    vi.stubEnv("CLINIC_DASHBOARD_TEST_PASSWORD", "test-password")
    vi.stubEnv("CSRF_SIGNING_SECRET", "test-only-csrf-signing-secret-value")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    providerMocks.loadTreatments.mockResolvedValue({
      ok: true,
      value: { catalogue: [offering.treatment], offerings: [offering], status: "ready" },
    })
    providerMocks.createTreatment.mockResolvedValue({ ok: true, value: offering })
    providerMocks.updateTreatment.mockResolvedValue({
      ok: true,
      value: { ...offering, active: true, price: 12.34 },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("reads privately through the request-scoped clinic provider", async () => {
    const response = await handleClinicTreatmentRead(request("GET"), createProvider)
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(createProvider).toHaveBeenCalledWith("controlled-access-token", "controlled-clinic")
  })

  it("creates without accepting a browser clinic id", async () => {
    const response = await handleClinicTreatmentCreate(
      request("POST", {
        active: false,
        clinicId: "foreign-clinic",
        price: 0,
        treatmentId: "treatment-1",
      }),
      createProvider,
    )
    expect(response.status).toBe(400)
    expect(providerMocks.createTreatment).not.toHaveBeenCalled()

    const accepted = await handleClinicTreatmentCreate(
      request("POST", { active: false, price: 0, treatmentId: "treatment-1" }),
      createProvider,
    )
    expect(accepted.status).toBe(201)
    expect(providerMocks.createTreatment).toHaveBeenCalledWith({
      active: false,
      price: 0,
      treatmentId: "treatment-1",
    })
  })

  it("patches only price and active and maps duplicate conflicts", async () => {
    const response = await handleClinicTreatmentUpdate(
      request("PATCH", { active: true, price: 12.34 }, "offering-1"),
      createProvider,
    )
    expect(response.status).toBe(200)
    expect(providerMocks.updateTreatment).toHaveBeenCalledWith("offering-1", {
      active: true,
      price: 12.34,
    })

    providerMocks.createTreatment.mockResolvedValueOnce({ error: "conflict", ok: false })
    const conflict = await handleClinicTreatmentCreate(
      request("POST", { active: false, price: 10, treatmentId: "treatment-1" }),
      createProvider,
    )
    expect(conflict.status).toBe(409)
  })

  it.each([-0.01, 12.345])("rejects invalid EUR price %s", async (price) => {
    const response = await handleClinicTreatmentCreate(
      request("POST", { active: false, price, treatmentId: "treatment-1" }),
      createProvider,
    )
    expect(response.status).toBe(400)
    expect(providerMocks.createTreatment).not.toHaveBeenCalled()
  })
})
