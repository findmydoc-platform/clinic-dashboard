import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"
import { patientInquiryStatusValues } from "@/features/clinic-dashboard/messages/model/inquiries"

const accessMocks = vi.hoisted(() => ({
  resolveClinicDashboardMutationAccess: vi.fn(),
}))

vi.mock("@/features/clinic-dashboard/auth/server/public", () => ({
  resolveClinicDashboardMutationAccess: accessMocks.resolveClinicDashboardMutationAccess,
}))

import { handlePatientInquiryStatusUpdate } from "@/features/clinic-dashboard/messages/server/public"

const upstreamInquiry = {
  createdAt: "2026-07-26T08:54:00.000Z",
  email: "l.weber@example.com",
  fullName: "Lukas Weber",
  id: "inquiry-1",
  message: "I would like to know which documents to prepare.",
  phoneNumber: "+49 000 0000001",
  preferredContactWindow: "afternoon",
  status: "submitted",
  treatment: { id: "treatment-1", name: "Hair transplant" },
  treatmentTimeline: "within_one_month",
  updatedAt: "2026-07-26T08:54:00.000Z",
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  })
}

function statusRequest(status: string) {
  const url = "http://localhost:3000/api/dashboard/inquiries/inquiry-1/status"
  const unsignedRequest = new NextRequest(url, {
    body: JSON.stringify({ status }),
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    method: "PATCH",
  })
  const token = createCsrfToken(unsignedRequest)

  return new NextRequest(url, {
    body: JSON.stringify({ status }),
    headers: {
      "content-type": "application/json",
      cookie: `clinic_dashboard_csrf=${token}`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
      origin: "http://localhost:3000",
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

describe("Patient inquiry status BFF boundary", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    accessMocks.resolveClinicDashboardMutationAccess.mockResolvedValue({
      accessToken: "access-token",
      applyToResponse: (response: Response) => {
        response.headers.set("x-session-applied", "true")
        response.headers.append(
          "set-cookie",
          "clinic-dashboard-auth=refreshed-session; HttpOnly; Path=/; SameSite=Lax",
        )
        return response
      },
      status: "approved",
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("checks the current own-clinic state before persisting an allowed transition", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(upstreamInquiry))
      .mockResolvedValueOnce(
        jsonResponse({
          doc: {
            ...upstreamInquiry,
            status: "in_review",
            updatedAt: "2026-07-26T09:08:00.000Z",
          },
        }),
      )
    vi.stubGlobal("fetch", fetcher)

    const response = await handlePatientInquiryStatusUpdate(statusRequest("in_review"), "inquiry-1")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      changedAt: "11:08",
      inquiry: { id: "inquiry-1", status: "in_review" },
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      cache: "no-store",
      redirect: "error",
    })
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      body: '{"status":"in_review"}',
      cache: "no-store",
      method: "PATCH",
      redirect: "error",
    })
    expect(response.headers.get("x-session-applied")).toBe("true")
    expect(response.headers.get("set-cookie")).toContain("clinic-dashboard-auth=refreshed-session")
    expectPrivate(response)
  })

  it.each(patientInquiryStatusValues)("rejects a %s status no-op without PATCH", async (status) => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        ...upstreamInquiry,
        status,
      }),
    )
    vi.stubGlobal("fetch", fetcher)

    const response = await handlePatientInquiryStatusUpdate(statusRequest(status), "inquiry-1")

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ code: "INQUIRY_STATUS_CONFLICT" })
    expect(fetcher).toHaveBeenCalledOnce()
    expectPrivate(response)
  })

  it.each([
    [401, 401, "INQUIRY_UNAUTHORIZED"],
    [403, 403, "INQUIRY_ACCESS_DENIED"],
    [404, 404, "INQUIRY_NOT_FOUND"],
    [409, 409, "INQUIRY_STATUS_CONFLICT"],
    [500, 503, "INQUIRY_SERVICE_UNAVAILABLE"],
  ] as const)(
    "maps an upstream %i response to a private %i response",
    async (upstreamStatus, expectedStatus, code) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => jsonResponse({ error: "upstream rejected request" }, upstreamStatus)),
      )

      const response = await handlePatientInquiryStatusUpdate(statusRequest("in_review"), "inquiry-1")

      expect(response.status).toBe(expectedStatus)
      await expect(response.json()).resolves.toEqual({ code })
      expectPrivate(response)
    },
  )

  it.each([
    ["unauthenticated", 401, "INQUIRY_UNAUTHORIZED"],
    ["unauthorized", 401, "INQUIRY_UNAUTHORIZED"],
    ["denied", 403, "INQUIRY_ACCESS_DENIED"],
    ["temporarily-unavailable", 503, "INQUIRY_SERVICE_UNAVAILABLE"],
  ] as const)("maps %s access to a private %i response", async (status, expectedStatus, code) => {
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)
    accessMocks.resolveClinicDashboardMutationAccess.mockResolvedValue({
      applyToResponse: (response: Response) => response,
      status,
    })

    const response = await handlePatientInquiryStatusUpdate(statusRequest("in_review"), "inquiry-1")

    expect(response.status).toBe(expectedStatus)
    await expect(response.json()).resolves.toEqual({ code })
    expect(fetcher).not.toHaveBeenCalled()
    expectPrivate(response)
  })
})
