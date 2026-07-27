import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { handlePatientInquiryStatusUpdate } from "@/features/clinic-dashboard/messages/server/public"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

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
  })

  afterEach(() => vi.unstubAllEnvs())

  it("accepts an allowed transition for an authenticated clinic session", async () => {
    const response = await handlePatientInquiryStatusUpdate(statusRequest("in_review"), "inquiry-lukas-weber")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      changedAt: "11:08",
      inquiry: {
        availableTransitions: ["contacted", "closed", "spam"],
        id: "inquiry-lukas-weber",
        status: "in_review",
      },
    })
    expectPrivate(response)
  })

  it("rejects invalid input and disallowed transitions", async () => {
    const invalid = await handlePatientInquiryStatusUpdate(statusRequest("unknown"), "inquiry-lukas-weber")
    expect(invalid.status).toBe(400)
    await expect(invalid.json()).resolves.toEqual({ code: "INVALID_INPUT" })

    const conflict = await handlePatientInquiryStatusUpdate(statusRequest("submitted"), "inquiry-lukas-weber")
    expect(conflict.status).toBe(409)
    await expect(conflict.json()).resolves.toEqual({ code: "INQUIRY_STATUS_CONFLICT" })
  })

  it("requires CSRF proof and an authenticated clinic session", async () => {
    const rejected = await handlePatientInquiryStatusUpdate(
      statusRequest("in_review", true, false),
      "inquiry-lukas-weber",
    )
    expect(rejected.status).toBe(403)
    await expect(rejected.json()).resolves.toEqual({ code: "REQUEST_REJECTED" })

    const unauthenticated = await handlePatientInquiryStatusUpdate(
      statusRequest("in_review", false),
      "inquiry-lukas-weber",
    )
    expect(unauthenticated.status).toBe(401)
    await expect(unauthenticated.json()).resolves.toEqual({ code: "INQUIRY_UNAUTHORIZED" })
  })
})
