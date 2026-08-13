import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  handleClinicTreatmentCreate,
  handleClinicTreatmentRead,
  handleClinicTreatmentUpdate,
} from "@/features/clinic-dashboard/server"
import { resetControlledClinicTreatmentProviders } from "@/features/clinic-dashboard/clinic-profile/server/controlled-clinic-treatments"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

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

describe("controlled clinic treatment BFF lifecycle", () => {
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
    resetControlledClinicTreatmentProviders()
  })

  afterEach(() => {
    resetControlledClinicTreatmentProviders()
    vi.unstubAllEnvs()
  })

  it("preserves POST and PATCH results across request-scoped provider composition", async () => {
    const createdResponse = await handleClinicTreatmentCreate(
      request("POST", { price: 125, treatmentId: "controlled-treatment-2" }),
    )
    expect(createdResponse.status).toBe(201)
    const created = await createdResponse.json()
    expect(created).toMatchObject({ active: false, price: 125 })

    const afterCreate = await handleClinicTreatmentRead(request("GET"))
    await expect(afterCreate.json()).resolves.toMatchObject({
      offerings: expect.arrayContaining([expect.objectContaining({ id: created.id, price: 125 })]),
    })

    const updatedResponse = await handleClinicTreatmentUpdate(
      request("PATCH", { active: true, expectedRevision: created.revision, price: 150 }, created.id),
    )
    expect(updatedResponse.status).toBe(200)

    const afterUpdate = await handleClinicTreatmentRead(request("GET"))
    await expect(afterUpdate.json()).resolves.toMatchObject({
      offerings: expect.arrayContaining([
        expect.objectContaining({ active: true, id: created.id, price: 150 }),
      ]),
    })
  })
})
