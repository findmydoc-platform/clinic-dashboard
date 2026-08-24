import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

const accessMocks = vi.hoisted(() => ({
  resolve: vi.fn(),
}))

vi.mock("@/features/clinic-dashboard/auth/server/public", () => ({
  resolveClinicDashboardMutationAccess: accessMocks.resolve,
}))

import {
  handleClinicTreatmentCreate,
  handleClinicTreatmentRead,
} from "@/features/clinic-dashboard/clinic-profile/server/clinic-treatment-actions"

function request(method: "GET" | "POST", body?: unknown) {
  const endpoint = new URL("http://localhost:3000/api/dashboard/clinic-treatments")
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
      cookie: `clinic_dashboard_csrf=${token}`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
    },
  })
}

describe("clinic treatment BFF capability access", () => {
  const provider = {
    createTreatment: vi.fn(),
    loadTreatments: vi.fn(),
    updateTreatment: vi.fn(),
  }
  const createProvider = vi.fn(() => provider)

  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "test-only-csrf-signing-secret-value")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    accessMocks.resolve.mockResolvedValue({
      accessToken: "access-token",
      applyToResponse: (response: Response) => response,
      capabilities: ["clinic-treatments:view"],
      clinicId: "clinic-1",
      status: "approved",
    })
    provider.loadTreatments.mockResolvedValue({
      ok: true,
      value: { catalogue: [], offerings: [], status: "ready" },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("allows reads but denies mutations for read-only treatment access", async () => {
    const readResponse = await handleClinicTreatmentRead(request("GET"), createProvider)
    expect(readResponse.status).toBe(200)
    expect(provider.loadTreatments).toHaveBeenCalledOnce()

    const createResponse = await handleClinicTreatmentCreate(
      request("POST", { price: 0, treatmentId: "treatment-1" }),
      createProvider,
    )
    expect(createResponse.status).toBe(403)
    expect(provider.createTreatment).not.toHaveBeenCalled()
  })

  it("does not instantiate a provider without treatment read access", async () => {
    accessMocks.resolve.mockResolvedValueOnce({
      accessToken: "access-token",
      applyToResponse: (response: Response) => response,
      capabilities: [],
      clinicId: "clinic-1",
      status: "approved",
    })

    const response = await handleClinicTreatmentRead(request("GET"), createProvider)

    expect(response.status).toBe(403)
    expect(createProvider).not.toHaveBeenCalled()
  })
})
