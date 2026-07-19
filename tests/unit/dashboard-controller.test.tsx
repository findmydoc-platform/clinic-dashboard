// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useDashboardController } from "@/features/clinic-dashboard/dashboard/hooks/useDashboardController"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"
import { downloadTextFile } from "@/lib/browser/download-text-file"

vi.mock("@/lib/browser/download-text-file", () => ({
  downloadTextFile: vi.fn(),
}))

const expectedProfileViewsCsv = [
  '"date","profileViews"',
  '"October 6","103"',
  '"October 7","111"',
  '"October 8","119"',
  '"October 9","117"',
  '"October 10","129"',
  '"October 11","135"',
  '"October 12","134"',
].join("\n")

function renderDashboardController(canExportProfileViews: boolean) {
  return renderHook(() =>
    useDashboardController({
      canExportProfileViews,
      initialReportingPeriod: "7 days",
      locationSummary: {
        coverAlt: "Fixture clinic exterior",
        coverImage: "/fixture-clinic-exterior.jpg",
        location: "Mitte, Berlin",
        name: "Berlin Health Clinic — Mitte",
      },
      snapshot: dashboardFixture,
    }),
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("dashboard controller", () => {
  it("retains the selected metric when the reporting period changes", () => {
    const { result } = renderDashboardController(false)

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

  it("downloads the profile-views CSV when the capability is available", () => {
    const { result } = renderDashboardController(true)

    act(() => result.current.actions.exportProfileViews())

    expect(downloadTextFile).toHaveBeenCalledOnce()
    expect(downloadTextFile).toHaveBeenCalledWith({
      content: expectedProfileViewsCsv,
      fileName: "profile-views-7-days.csv",
      mimeType: "text/csv",
    })
  })

  it("does not download profile views when the capability is unavailable", () => {
    const { result } = renderDashboardController(false)

    act(() => result.current.actions.exportProfileViews())

    expect(downloadTextFile).not.toHaveBeenCalled()
  })
})
