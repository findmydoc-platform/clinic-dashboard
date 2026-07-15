import { describe, expect, it } from "vitest"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import { createDashboardReportingSnapshot, dashboardReportingPeriods } from "@/lib/clinic-dashboard/reporting"

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
    const snapshots = dashboardReportingPeriods.map(
      (period) => clinicDashboardFixture.dashboard.reporting[period],
    )

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
      expect(snapshot.chart.points.reduce((total, point) => total + point.value, 0)).toBe(profileViews)
      expect(snapshot.chart.comparison).toContain(`previous ${snapshot.period}`)
      expect(snapshot.chart.comparison).not.toContain("year")
      expect(snapshot.funnel.map(({ conversion }) => conversion)).toEqual(
        expectedConversions[snapshot.period],
      )
      expect(snapshot.metrics.find(({ id }) => id === "completion")).toMatchObject({
        progress: 82,
        value: "82%",
      })
    }

    expect(clinicDashboardFixture.dashboard.profileTasks).toHaveLength(4)
  })

  it("keeps lifetime reputation stable while period review activity changes", () => {
    expect(clinicDashboardFixture.dashboard.rating).toMatchObject({
      count: 1_248,
      pendingResponses: 1,
      value: 4.8,
    })
    expect(clinicDashboardFixture.dashboard.rating.pendingResponses).toBe(
      clinicDashboardFixture.reviews.items.filter(({ status }) => status === "Open").length,
    )
    expect(clinicDashboardFixture.dashboard.reporting["7 days"].reviewActivity).toContain("1 new review")
    expect(clinicDashboardFixture.dashboard.reporting["30 days"].reviewActivity).toContain("5 new reviews")
    expect(clinicDashboardFixture.dashboard.reporting["90 days"].reviewActivity).toContain("17 new reviews")
  })

  it("rejects a chart whose points do not add up to the selected profile views", () => {
    expect(() =>
      createDashboardReportingSnapshot({
        changes: { contacts: "0%", impressions: "0%", inquiries: "0%", profileViews: "0%" },
        chart: {
          comparison: "0% vs. previous 7 days",
          description: "Invalid fixture",
          points: [{ dateLabel: "Today", value: 4 }],
        },
        period: "7 days",
        reviewActivity: "No new reviews in the last 7 days",
        totals: {
          contacts: 2,
          impressions: 100,
          inquiries: 1,
          profileViews: 5,
          uniqueVisitors: 3,
        },
      }),
    ).toThrow("must total 5, received 4")
  })
})
