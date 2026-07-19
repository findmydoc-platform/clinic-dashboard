import { describe, expect, it } from "vitest"
import {
  createDashboardReportingSnapshot,
  dashboardReportingPeriods,
  dashboardSelectableMetricIds,
} from "@/features/clinic-dashboard/dashboard/model/reporting"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"
import { reviewsFixture } from "@/features/clinic-dashboard/reviews/testing/reviews.fixtures"

describe("dashboard reporting fixtures", () => {
  const expectedConversions = {
    "7 days": [
      undefined,
      "18.1% of impressions",
      "64.0% of profile views",
      "2.2% of unique visitors",
      "41.7% of contacts",
    ],
    "30 days": [
      undefined,
      "17.8% of impressions",
      "64.1% of profile views",
      "2.0% of unique visitors",
      "38.1% of contacts",
    ],
    "90 days": [
      undefined,
      "17.5% of impressions",
      "63.8% of profile views",
      "2.0% of unique visitors",
      "38.1% of contacts",
    ],
  } as const

  it("keeps cumulative reporting values plausible across 7, 30, and 90 days", () => {
    const snapshots = dashboardReportingPeriods.map((period) => dashboardFixture.reporting[period])

    for (const key of ["impressions", "profileViews", "uniqueVisitors", "contacts", "inquiries"] as const) {
      expect(snapshots[0].totals[key]).toBeLessThan(snapshots[1].totals[key])
      expect(snapshots[1].totals[key]).toBeLessThan(snapshots[2].totals[key])
    }

    for (const snapshot of snapshots) {
      const { contacts, impressions, inquiries, profileViews, uniqueVisitors } = snapshot.totals
      expect(impressions).toBeGreaterThan(profileViews)
      expect(profileViews).toBeGreaterThan(uniqueVisitors)
      expect(uniqueVisitors).toBeGreaterThan(contacts)
      expect(contacts).toBeGreaterThan(inquiries)
      const expectedSeriesTotals = {
        contacts,
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
      expect(snapshot.funnel.map(({ conversion }) => conversion)).toEqual(
        expectedConversions[snapshot.period],
      )
      expect(snapshot.metrics.find(({ id }) => id === "completion")).toMatchObject({
        progress: 82,
        value: "82%",
      })
    }

    expect(dashboardFixture.profileTasks).toHaveLength(4)
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
        changes: { contacts: "0%", impressions: "0%", inquiries: "0%", views: "0%" },
        chart: {
          cadence: "daily",
          dates: [{ dateLabel: "Today" }],
          series: {
            contacts: [2],
            impressions: [100],
            inquiries: [1],
            uniqueVisitors: [3],
            views: [4],
          },
        },
        period: "7 days",
        profileCompletion: 82,
        reviewActivity: "No new reviews in the last 7 days",
        totals: {
          contacts: 2,
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
        changes: { contacts: "0%", impressions: "0%", inquiries: "0%", views: "0%" },
        chart: {
          cadence: "daily",
          dates: [{ dateLabel: "Yesterday" }, { dateLabel: "Today" }],
          series: {
            contacts: [2],
            impressions: [40, 60],
            inquiries: [0, 1],
            uniqueVisitors: [1, 2],
            views: [2, 3],
          },
        },
        period: "7 days",
        profileCompletion: 82,
        reviewActivity: "No new reviews in the last 7 days",
        totals: {
          contacts: 2,
          impressions: 100,
          inquiries: 1,
          profileViews: 5,
          uniqueVisitors: 3,
        },
      }),
    ).toThrow("contacts chart for 7 days must provide 2 values, received 1")
  })
})
