// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { useDashboardController } from "@/features/clinic-dashboard/dashboard/hooks/useDashboardController"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"

afterEach(cleanup)

describe("dashboard controller", () => {
  it("retains the selected metric when the reporting period changes", () => {
    const { result } = renderHook(() =>
      useDashboardController({
        canExportProfileViews: false,
        initialReportingPeriod: "7 days",
        locationSummary: {
          location: "Mitte, Berlin",
          name: "Berlin Health Clinic — Mitte",
        },
        snapshot: dashboardFixture,
      }),
    )

    expect(result.current.model.selectedMetricId).toBe("views")

    act(() => result.current.actions.selectMetric("contacts"))
    act(() => result.current.actions.changeReportingPeriod("90 days"))

    expect(result.current.model.reportingPeriod).toBe("90 days")
    expect(result.current.model.selectedMetricId).toBe("contacts")
    expect(result.current.model.viewModel.selectedMetric).toMatchObject({
      comparison: "+4.4% vs. previous 90 days",
      id: "contacts",
      title: "Contacts over time",
    })
  })
})
