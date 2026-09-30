// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest"
import { loadClinicDashboardReportingFromBrowser } from "@/features/clinic-dashboard/dashboard/browser/reporting-api"
import { clinicDashboardReportingFixture } from "@/features/clinic-dashboard/dashboard/testing/clinic-dashboard-reporting.fixtures"

describe("clinic dashboard reporting browser adapter", () => {
  it("sends only periodDays to the same-origin BFF", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify(clinicDashboardReportingFixture), {
          headers: { "content-type": "application/json" },
        }),
    )

    await expect(loadClinicDashboardReportingFromBrowser(90, fetcher)).resolves.toEqual(
      clinicDashboardReportingFixture,
    )

    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "http://localhost:3000/api/dashboard/reporting?periodDays=90",
    )
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      cache: "no-store",
      headers: { Accept: "application/json" },
      redirect: "error",
    })
    expect(JSON.stringify(fetcher.mock.calls[0]?.[1])).not.toContain("Authorization")
  })

  it("rejects malformed BFF data rather than producing a metric value", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ period: { days: 30 }, schemaVersion: "unexpected", timezone: "UTC" })),
    )

    await expect(loadClinicDashboardReportingFromBrowser(30, fetcher)).resolves.toBeUndefined()
  })
})
