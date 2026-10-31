import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const accessMocks = vi.hoisted(() => ({ resolveClinicDashboardRouteAccess: vi.fn() }))

vi.mock("@/features/clinic-dashboard/auth/server/public", () => ({
  getClinicDashboardAccess: vi.fn(),
  getClinicDashboardAccessToken: vi.fn(),
  resolveClinicDashboardRouteAccess: accessMocks.resolveClinicDashboardRouteAccess,
}))

import { handleClinicDashboardReportingLoad } from "@/features/clinic-dashboard/server"

const reportingFixture = {
  asOf: "2026-09-17T12:00:00.000Z",
  comparisonPeriod: {
    days: 30,
    from: "2026-07-19T12:00:00.000Z",
    to: "2026-08-18T12:00:00.000Z",
  },
  metrics: {
    inquiries: countMetric("payload", 7),
    profileViews: countMetric("posthog", 284),
    uniqueVisitors: countMetric("posthog", 200),
    impressions: countMetric("posthog", 500),
    inquiryStarters: countMetric("posthog", 9),
    reviews: {
      average: { comparison: null, source: "payload", state: "available", value: 4.8 },
      count: { comparison: null, source: "payload", state: "available", value: 25 },
      source: "payload",
    },
  },
  period: {
    days: 30,
    from: "2026-08-18T12:00:00.000Z",
    to: "2026-09-17T12:00:00.000Z",
  },
  schemaVersion: "clinic-dashboard-reporting-v2",
  timezone: "Europe/Istanbul",
} as const

function countMetric(source: "payload" | "posthog", value: number) {
  return {
    comparison: {
      absoluteDelta: 2,
      relativeDeltaPercent: (2 / (value - 2)) * 100,
      state: "available",
      value: value - 2,
    },
    current: { state: "available", value },
    source,
  } as const
}

function privateReportingResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/json",
      expires: "0",
      pragma: "no-cache",
      vary: "Authorization, X-Findmydoc-Clinic-Scope-Contract, X-Findmydoc-Reporting-Contract",
    },
    status,
  })
}

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe("private, no-store")
  expect(response.headers.get("pragma")).toBe("no-cache")
  expect(response.headers.get("expires")).toBe("0")
  expect(response.headers.get("vary")).toBe("Cookie")
}

describe("clinic dashboard reporting BFF", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef") // pragma: allowlist secret
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    accessMocks.resolveClinicDashboardRouteAccess.mockResolvedValue({
      accessToken: "session-access-token",
      applyToResponse: (response: Response) => {
        response.headers.set("x-session-applied", "true")
        return response
      },
      clinicId: "server-derived-clinic",
      status: "approved",
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("forwards only the selected period through the session-bound private boundary", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => privateReportingResponse(reportingFixture))
    vi.stubGlobal("fetch", fetcher)

    const response = await handleClinicDashboardReportingLoad(
      new NextRequest(
        "http://localhost:3000/api/dashboard/clinics/server-derived-clinic/reporting?periodDays=30",
      ),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual(reportingFixture)
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "https://preview.findmydoc.eu/api/clinic-dashboard/clinics/server-derived-clinic/reporting?periodDays=30",
    )
    const [, upstreamInit] = fetcher.mock.calls[0] ?? []
    expect(upstreamInit).toMatchObject({
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer session-access-token",
        "X-Findmydoc-Reporting-Contract": "clinic-dashboard-reporting-v2",
      },
      redirect: "error",
    })
    expect(JSON.stringify(upstreamInit)).not.toContain("server-derived-clinic")
    expect(JSON.stringify(body)).not.toContain("session-access-token")
    expect(accessMocks.resolveClinicDashboardRouteAccess).toHaveBeenCalledWith(
      expect.any(NextRequest),
      undefined,
      "server-derived-clinic",
    )
    expect(response.headers.get("x-session-applied")).toBe("true")
    expectPrivate(response)
  })

  it.each([
    "/api/dashboard/clinics/server-derived-clinic/reporting",
    "/api/dashboard/clinics/server-derived-clinic/reporting?periodDays=31",
    "/api/dashboard/clinics/server-derived-clinic/reporting?periodDays=7&periodDays=30",
    "/api/dashboard/clinics/server-derived-clinic/reporting?periodDays=7&clinicId=other-clinic",
  ])("rejects invalid browser input %s before reading the session", async (path) => {
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)

    const response = await handleClinicDashboardReportingLoad(new NextRequest(`http://localhost:3000${path}`))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ code: "REPORTING_INVALID_INPUT" })
    expect(accessMocks.resolveClinicDashboardRouteAccess).not.toHaveBeenCalled()
    expect(fetcher).not.toHaveBeenCalled()
    expectPrivate(response)
  })

  it("preserves metric-level unknown states instead of fabricating zero values", async () => {
    const unknownReporting = {
      ...reportingFixture,
      metrics: {
        ...reportingFixture.metrics,
        uniqueVisitors: {
          ...reportingFixture.metrics.uniqueVisitors,
          comparison: {
            absoluteDelta: null,
            relativeDeltaPercent: null,
            state: "partial_coverage",
            value: null,
          },
          current: { state: "source_unavailable", value: null },
        },
      },
    }
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => privateReportingResponse(unknownReporting)),
    )

    const response = await handleClinicDashboardReportingLoad(
      new NextRequest(
        "http://localhost:3000/api/dashboard/clinics/server-derived-clinic/reporting?periodDays=30",
      ),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      metrics: { uniqueVisitors: { current: { state: "source_unavailable", value: null } } },
    })
    expectPrivate(response)
  })

  it("maps invalid or unavailable upstream results to a safe BFF error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () =>
        privateReportingResponse({ error: { detail: "internal upstream detail" } }, 503),
      ),
    )

    const response = await handleClinicDashboardReportingLoad(
      new NextRequest(
        "http://localhost:3000/api/dashboard/clinics/server-derived-clinic/reporting?periodDays=7",
      ),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ code: "REPORTING_SERVICE_UNAVAILABLE" })
    expectPrivate(response)
  })

  it.each([
    [
      "omits a required nested metric",
      (() => {
        const { profileViews: _profileViews, ...metrics } = reportingFixture.metrics
        return { ...reportingFixture, metrics }
      })(),
    ],
    [
      "claims an available visitor count without a value",
      {
        ...reportingFixture,
        metrics: {
          ...reportingFixture.metrics,
          uniqueVisitors: {
            ...reportingFixture.metrics.uniqueVisitors,
            current: { state: "available", value: null },
          },
        },
      },
    ],
    [
      "changes a nested metric value type",
      {
        ...reportingFixture,
        metrics: {
          ...reportingFixture.metrics,
          profileViews: {
            ...reportingFixture.metrics.profileViews,
            current: { state: "available", value: "284" },
          },
        },
      },
    ],
  ])("fails closed when the upstream response %s", async (_description, invalidReporting) => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => privateReportingResponse(invalidReporting)),
    )

    const response = await handleClinicDashboardReportingLoad(
      new NextRequest(
        "http://localhost:3000/api/dashboard/clinics/server-derived-clinic/reporting?periodDays=30",
      ),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ code: "REPORTING_SERVICE_UNAVAILABLE" })
    expectPrivate(response)
  })
})
