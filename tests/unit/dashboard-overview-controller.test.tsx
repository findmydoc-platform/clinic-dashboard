// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
import { useDashboardOverviewController } from "@/features/clinic-dashboard/dashboard/hooks/useDashboardOverviewController"
import { clinicDashboardReportingFixture } from "@/features/clinic-dashboard/dashboard/testing/clinic-dashboard-reporting.fixtures"
import { dashboardProfileProgressReady } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"

afterEach(cleanup)

it("retains the selected measurement across a reporting period change", async () => {
  const { result } = renderHook(() =>
    useDashboardOverviewController({
      initialReporting: { status: "ready", reporting: clinicDashboardReportingFixture },
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: { status: "unavailable", name: "Controlled clinic" },
      loadReporting: async (days) => ({
        ...clinicDashboardReportingFixture,
        period: { ...clinicDashboardReportingFixture.period, days },
      }),
    }),
  )
  act(() => result.current.actions.selectMetric("ctaInteractions"))
  await act(async () => {
    await result.current.actions.changePeriodDays(7)
  })
  expect(result.current.model.periodDays).toBe(7)
  expect(result.current.model.selectedMetric.id).toBe("ctaInteractions")
  expect(result.current.model.profileProgress).toBe(dashboardProfileProgressReady)
})
