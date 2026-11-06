import { describe, expect, it } from "vitest"
import {
  createDashboardReportingSnapshot,
  dashboardReportingPeriods,
  dashboardSelectableMetricIds,
} from "@/features/clinic-dashboard/dashboard/model/reporting"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"
import { reviewsFixture } from "@/features/clinic-dashboard/reviews/testing/reviews.fixtures"

describe("dashboard reporting fixtures", () => {
  it("keeps cumulative reporting values plausible across 7, 30, and 90 days", () => {
    const snapshots = dashboardReportingPeriods.map((period) => dashboardFixture.reporting[period])

    for (const key of ["impressions", "profileViews", "uniqueVisitors", "inquiries"] as const) {
      expect(snapshots[0].totals[key]).toBeLessThan(snapshots[1].totals[key])
      expect(snapshots[1].totals[key]).toBeLessThan(snapshots[2].totals[key])
    }

    for (const snapshot of snapshots) {
      const { impressions, inquiries, profileViews, uniqueVisitors } = snapshot.totals
      expect(impressions).toBeGreaterThan(profileViews)
      expect(profileViews).toBeGreaterThan(uniqueVisitors)
      expect(uniqueVisitors).toBeGreaterThan(inquiries)
      const expectedSeriesTotals = {
        impressions,
        inquiries,
        uniqueVisitors,
        views: profileViews,
      }

      for (const metricId of dashboardSelectableMetricIds) {
        expect(snapshot.chart.series[metricId].reduce((total, point) => total + point.value, 0)).toBe(
          expectedSeriesTotals[metricId],
        )
      }
      expect(snapshot.funnel.map((step) => "conversion" in step)).toEqual([false, false, false, false])
      expect(snapshot.metrics.map(({ id }) => id)).toEqual(["impressions", "views", "inquiries"])
    }
  })

  it("keeps lifetime reputation stable while period review activity changes", () => {
    expect(dashboardFixture.rating).toMatchObject({
      count: 1_248,
      pendingResponses: 1,
      value: 4.8,
    })
    expect(dashboardFixture.rating.pendingResponses).toBe(
      reviewsFixture.items.filter(({ pendingResponse }) => pendingResponse?.status === "pending-moderation")
        .length,
    )
    expect(dashboardFixture.reporting["7 days"].reviewActivity).toContain("1 new review")
    expect(dashboardFixture.reporting["30 days"].reviewActivity).toContain("5 new reviews")
    expect(dashboardFixture.reporting["90 days"].reviewActivity).toContain("17 new reviews")
  })

  it("rejects a chart whose points do not add up to the selected profile views", () => {
    expect(() =>
      createDashboardReportingSnapshot({
        changes: { impressions: "0%", inquiries: "0%", views: "0%" },
        chart: {
          cadence: "daily",
          dates: [{ dateLabel: "Today" }],
          series: {
            impressions: [100],
            inquiries: [1],
            uniqueVisitors: [3],
            views: [4],
          },
        },
        period: "7 days",
        reviewActivity: "No new reviews in the last 7 days",
        totals: {
          impressions: 100,
          inquiries: 1,
          profileViews: 5,
          uniqueVisitors: 3,
        },
      }),
    ).toThrow("views chart for 7 days must total 5, received 4")
  })

  it("rejects a metric series whose value count does not match its dates", () => {
    expect(() =>
      createDashboardReportingSnapshot({
        changes: { impressions: "0%", inquiries: "0%", views: "0%" },
        chart: {
          cadence: "daily",
          dates: [{ dateLabel: "Yesterday" }, { dateLabel: "Today" }],
          series: {
            impressions: [40, 60],
            inquiries: [0, 1],
            uniqueVisitors: [3],
            views: [2, 3],
          },
        },
        period: "7 days",
        reviewActivity: "No new reviews in the last 7 days",
        totals: {
          impressions: 100,
          inquiries: 1,
          profileViews: 5,
          uniqueVisitors: 3,
        },
      }),
    ).toThrow("uniqueVisitors chart for 7 days must provide 2 values, received 1")
  })
})
