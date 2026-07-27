import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { handlePatientInquiryStatusUpdate } from "@/features/clinic-dashboard/messages/server/public"
import type { PatientInquiryProviderFactory } from "@/features/clinic-dashboard/messages/server/patient-inquiry-provider"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

const providerMocks = vi.hoisted(() => ({
  changeStatus: vi.fn(),
}))

const createProvider = vi.fn((_: string) => ({
  changeStatus: providerMocks.changeStatus,
  loadQueue: vi.fn(),
})) satisfies PatientInquiryProviderFactory

function statusRequest(status: string, session = true, csrf = true) {
  const url = "http://localhost:3000/api/dashboard/inquiries/inquiry-lukas-weber/status"
  const baseRequest = new NextRequest(url, {
    body: JSON.stringify({ status }),
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    method: "PATCH",
  })
  const token = createCsrfToken(baseRequest)
  const cookies = [
    ...(csrf ? [`clinic_dashboard_csrf=${token}`] : []),
    ...(session ? ["clinic_dashboard_controlled_session=controlled-clinic-staff"] : []),
  ]

  return new NextRequest(url, {
    body: JSON.stringify({ status }),
    headers: {
      "content-type": "application/json",
      cookie: cookies.join("; "),
      origin: "http://localhost:3000",
      ...(csrf ? { [CLINIC_DASHBOARD_CSRF_HEADER]: token } : {}),
    },
    method: "PATCH",
  })
}

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe("private, no-store")
  expect(response.headers.get("pragma")).toBe("no-cache")
  expect(response.headers.get("expires")).toBe("0")
  expect(response.headers.get("vary")).toBe("Cookie")
}

describe("Patient inquiry status mutation", () => {
  beforeEach(() => {
    vi.stubEnv("CLINIC_DASHBOARD_AUTH_TEST_MODE", "controlled")
    vi.stubEnv("CLINIC_DASHBOARD_TEST_PASSWORD", "test-password")
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    providerMocks.changeStatus.mockResolvedValue({
      ok: true,
      value: {
        changedAt: "11:08",
        inquiry: {
          availableTransitions: ["contacted", "closed", "spam"],
          contactWindow: "Weekdays after 16:00",
          createdAt: "2026-07-26T08:54:00.000Z",
          dateLabel: "26 July 2026",
          email: "l.weber@example.com",
          id: "inquiry-lukas-weber",
          interest: "Hair transplant",
          message: "I am interested in a hair transplant and would like to know which documents to prepare.",
          name: "Lukas Weber",
          phone: "+49 000 0000001",
          status: "in_review",
          timeLabel: "10:54",
          treatmentTimeline: "Within 3–6 months",
        },
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("delegates an allowed transition to the request-scoped provider", async () => {
    const response = await handlePatientInquiryStatusUpdate(
      statusRequest("in_review"),
      "inquiry-lukas-weber",
      createProvider,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      changedAt: "11:08",
      inquiry: {
        availableTransitions: ["contacted", "closed", "spam"],
        id: "inquiry-lukas-weber",
        status: "in_review",
      },
    })
    expect(createProvider).toHaveBeenCalledWith("controlled-access-token")
    expect(providerMocks.changeStatus).toHaveBeenCalledWith({
      inquiryId: "inquiry-lukas-weber",
      status: "in_review",
    })
    expectPrivate(response)
  })

  it("rejects invalid input and maps provider conflicts", async () => {
    const invalid = await handlePatientInquiryStatusUpdate(
      statusRequest("unknown"),
      "inquiry-lukas-weber",
      createProvider,
    )
    expect(invalid.status).toBe(400)
    await expect(invalid.json()).resolves.toEqual({ code: "INVALID_INPUT" })
    expect(providerMocks.changeStatus).not.toHaveBeenCalled()

    providerMocks.changeStatus.mockResolvedValueOnce({ error: "conflict", ok: false })
    const conflict = await handlePatientInquiryStatusUpdate(
      statusRequest("submitted"),
      "inquiry-lukas-weber",
      createProvider,
    )
    expect(conflict.status).toBe(409)
    await expect(conflict.json()).resolves.toEqual({ code: "INQUIRY_STATUS_CONFLICT" })
  })

  it("requires CSRF proof and an authenticated clinic session before composition", async () => {
    const rejected = await handlePatientInquiryStatusUpdate(
      statusRequest("in_review", true, false),
      "inquiry-lukas-weber",
      createProvider,
    )
    expect(rejected.status).toBe(403)
    await expect(rejected.json()).resolves.toEqual({ code: "REQUEST_REJECTED" })

    const unauthenticated = await handlePatientInquiryStatusUpdate(
      statusRequest("in_review", false),
      "inquiry-lukas-weber",
      createProvider,
    )
    expect(unauthenticated.status).toBe(401)
    await expect(unauthenticated.json()).resolves.toEqual({ code: "INQUIRY_UNAUTHORIZED" })
    expect(createProvider).not.toHaveBeenCalled()
  })
})
