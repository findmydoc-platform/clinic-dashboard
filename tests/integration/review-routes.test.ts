import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

const accessMocks = vi.hoisted(() => ({ resolveClinicDashboardRouteAccess: vi.fn() }))
vi.mock("@/features/clinic-dashboard/auth/server/public", () => ({
  getClinicDashboardAccess: vi.fn(),
  getClinicDashboardAccessToken: vi.fn(),
  resolveClinicDashboardRouteAccess: accessMocks.resolveClinicDashboardRouteAccess,
}))

import {
  handleReviewAppealSubmit,
  handleReviewHistoryLoad,
  handleReviewListLoad,
  handleReviewResponseSubmit,
} from "@/features/clinic-dashboard/server"

function mutationRequest(path: string, body: unknown) {
  const url = `http://localhost:3000${path}`
  const unsigned = new NextRequest(url, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    method: "POST",
  })
  const token = createCsrfToken(unsigned)
  return new NextRequest(url, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      cookie: `clinic_dashboard_csrf=${token}`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
      origin: "http://localhost:3000",
    },
    method: "POST",
  })
}

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe("private, no-store")
  expect(response.headers.get("vary")).toBe("Cookie")
}

describe("review workflow BFF", () => {
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
    accessMocks.resolveClinicDashboardRouteAccess.mockResolvedValue({
      accessToken: "access-token",
      applyToResponse: (response: Response) => response,
      clinicId: "clinic-1",
      status: "approved",
    })
  })
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("loads a private clinic review page with strict filters", async () => {
    const response = await handleReviewListLoad(
      new NextRequest("http://localhost:3000/api/dashboard/reviews?visibility=removed"),
    )
    expect(response.status).toBe(200)
    expectPrivate(response)
    await expect(response.json()).resolves.toMatchObject({ page: { items: [{ publicMeasure: "removed" }] } })
  })

  it("requires CSRF before response and appeal mutations", async () => {
    const invalid = new NextRequest("http://localhost:3000/api/dashboard/reviews/seed-review-01/response", {
      body: JSON.stringify({ body: "A sufficiently long response." }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
    const response = await handleReviewResponseSubmit(invalid, "seed-review-01")
    expect(response.status).toBe(403)
    expect(accessMocks.resolveClinicDashboardRouteAccess).not.toHaveBeenCalled()
    const appeal = await handleReviewAppealSubmit(
      mutationRequest("/api/dashboard/reviews/seed-review-01/appeal", {
        details: "This review belongs to another clinic location.",
        reason: "incorrect_clinic",
      }),
      "seed-review-01",
    )
    expect(appeal.status).toBe(200)
    expectPrivate(appeal)
  })

  it("loads private safe history and returns tenant-safe not found", async () => {
    const history = await handleReviewHistoryLoad(
      new NextRequest("http://localhost:3000/api/dashboard/reviews/seed-review-01/history"),
      "seed-review-01",
    )
    expect(history.status).toBe(200)
    expectPrivate(history)
    const missing = await handleReviewHistoryLoad(
      new NextRequest("http://localhost:3000/api/dashboard/reviews/unknown/history"),
      "unknown",
    )
    expect(missing.status).toBe(404)
    await expect(missing.json()).resolves.toEqual({ code: "REVIEW_NOT_FOUND" })
  })

  it("rejects revisions after a response has been decided", async () => {
    const response = await handleReviewResponseSubmit(
      mutationRequest("/api/dashboard/reviews/seed-review-01/response", {
        body: "Thank you for the detailed feedback. We are reviewing it with our team.",
      }),
      "seed-review-01",
    )

    expect(response.status).toBe(409)
    expectPrivate(response)
    await expect(response.json()).resolves.toEqual({ code: "REVIEW_WORKFLOW_CONFLICT" })
  })
})
