// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest"
import { loadClinicDashboardReportingFromBrowser } from "@/features/clinic-dashboard/dashboard/browser/reporting-api"
import { clinicDashboardReportingFixture } from "@/features/clinic-dashboard/dashboard/testing/clinic-dashboard-reporting.fixtures"

describe("clinic dashboard reporting browser adapter", () => {
  it("loads the reduced V3 reporting contract", async () => {
    const body = {
      ...clinicDashboardReportingFixture,
      schemaVersion: "clinic-dashboard-reporting-v3",
      metrics: {
        impressions: clinicDashboardReportingFixture.metrics.impressions,
        profileViews: clinicDashboardReportingFixture.metrics.profileViews,
        uniqueVisitors: clinicDashboardReportingFixture.metrics.uniqueVisitors,
        inquiries: clinicDashboardReportingFixture.metrics.inquiries,
        reviews: clinicDashboardReportingFixture.metrics.reviews,
      },
    }
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(body))
    await expect(loadClinicDashboardReportingFromBrowser("clinic-1", 30, fetcher)).resolves.toEqual(body)
  })

  it("sends only periodDays to the same-origin BFF", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify(clinicDashboardReportingFixture), {
          headers: { "content-type": "application/json" },
        }),
    )

    await expect(loadClinicDashboardReportingFromBrowser("clinic-1", 90, fetcher)).resolves.toEqual(
      clinicDashboardReportingFixture,
    )

    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "http://localhost:3000/api/dashboard/clinics/clinic-1/reporting?periodDays=90",
    )
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      cache: "no-store",
      headers: { Accept: "application/json" },
      redirect: "error",
    })
    expect(JSON.stringify(fetcher.mock.calls[0]?.[1])).not.toContain("Authorization")
  })

  it("rejects a V3 response missing the visitor metric", async () => {
    const { uniqueVisitors: _visitors, ...metrics } = clinicDashboardReportingFixture.metrics
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ ...clinicDashboardReportingFixture, metrics }),
    )
    await expect(loadClinicDashboardReportingFromBrowser("clinic-1", 30, fetcher)).resolves.toBeUndefined()
  })

  it.each([
    { ...clinicDashboardReportingFixture, schemaVersion: "clinic-dashboard-reporting-v2" },
    {
      ...clinicDashboardReportingFixture,
      metrics: { ...clinicDashboardReportingFixture.metrics, unexpected: { source: "posthog" } },
    },
  ])("rejects an obsolete version or additional metric", async (body) => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(body))
    await expect(loadClinicDashboardReportingFromBrowser("clinic-1", 30, fetcher)).resolves.toBeUndefined()
  })

  it("rejects malformed BFF data rather than producing a metric value", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ period: { days: 30 }, schemaVersion: "unexpected", timezone: "UTC" })),
    )

    await expect(loadClinicDashboardReportingFromBrowser("clinic-1", 30, fetcher)).resolves.toBeUndefined()
  })
})
