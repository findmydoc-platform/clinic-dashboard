import { describe, expect, it } from "vitest"
import { createDashboardPrototypeViewModel } from "@/features/clinic-dashboard/dashboard/dashboard.prototype-data.mapper"
import {
  createDashboardMetricSelection,
  dashboardMetricDefinitions,
} from "@/features/clinic-dashboard/dashboard/model/dashboard-metric-selection"
import {
  dashboardReportingPeriods,
  dashboardSelectableMetricIds,
  isDashboardSelectableMetricId,
} from "@/features/clinic-dashboard/dashboard/model/reporting"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"

describe("dashboard metric selection", () => {
  it("keeps the eligible metric set explicit and excludes profile completion", () => {
    expect(dashboardSelectableMetricIds).toEqual([
      "impressions",
      "views",
      "uniqueVisitors",
      "contacts",
      "inquiries",
    ])
    expect(dashboardSelectableMetricIds.every(isDashboardSelectableMetricId)).toBe(true)
    expect(isDashboardSelectableMetricId("completion")).toBe(false)
  })

  it("uses profile views as the default dashboard selection", () => {
    const model = createDashboardPrototypeViewModel(dashboardFixture, "7 days", {
      location: "Mitte, Berlin",
      name: "Berlin Health Clinic — Mitte",
    })

    expect(model.selectedMetric.id).toBe("views")
    expect(model.selectedMetric.title).toBe("Profile views over time")
    expect(model.selectedMetric.comparison).toBe("+10.1% vs. previous 7 days")
  })

  it("derives every selected chart contract from the metric definition and selected period", () => {
    for (const period of dashboardReportingPeriods) {
      const reporting = dashboardFixture.reporting[period]

      for (const metricId of dashboardSelectableMetricIds) {
        const selection = createDashboardMetricSelection(reporting, metricId)
        const definition = dashboardMetricDefinitions[metricId]

        expect(selection.title).toBe(`${definition.label} over time`)
        expect(selection.description).toContain(definition.valueLabels.plural)
        expect(selection.description).toContain(`selected ${period}`)
        expect(selection.description).toContain("not live analytics")
        expect(selection.points).toBe(reporting.chart.series[metricId])
        expect(selection.summary.filter(({ isSelected }) => isSelected)).toEqual([
          expect.objectContaining({ id: metricId, label: definition.label }),
        ])
      }
    }
  })

  it("uses the funnel conversion as context for unique visitors", () => {
    const selection = createDashboardMetricSelection(dashboardFixture.reporting["30 days"], "uniqueVisitors")

    expect(selection.title).toBe("Unique visitors over time")
    expect(selection.comparison).toBe("64.1% of profile views")
  })
})
