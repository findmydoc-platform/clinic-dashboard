// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { useDashboardOverviewController } from "@/features/clinic-dashboard/dashboard/hooks/useDashboardOverviewController"
import { clinicDashboardReportingFixture } from "@/features/clinic-dashboard/dashboard/testing/clinic-dashboard-reporting.fixtures"
import { dashboardProfileProgressReady } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"
import type { ClinicDashboardReportingLoadState } from "@/features/clinic-dashboard/dashboard/model/clinic-dashboard-reporting"

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

it("shows a refreshed server snapshot without resetting the selected measurement", () => {
  const updatedReporting = {
    ...clinicDashboardReportingFixture,
    asOf: "2026-09-18T12:00:00.000Z",
    metrics: {
      ...clinicDashboardReportingFixture.metrics,
      profileViews: {
        ...clinicDashboardReportingFixture.metrics.profileViews,
        current: { state: "available" as const, value: 301 },
      },
    },
  }
  const { result, rerender } = renderHook(
    ({ initialReporting }: { initialReporting: ClinicDashboardReportingLoadState }) =>
      useDashboardOverviewController({
        initialReporting,
        profileProgress: dashboardProfileProgressReady,
        clinicPreview: { status: "unavailable", name: "Controlled clinic" },
      }),
    { initialProps: { initialReporting: { status: "ready", reporting: clinicDashboardReportingFixture } } },
  )

  act(() => result.current.actions.selectMetric("ctaInteractions"))
  rerender({ initialReporting: { status: "ready", reporting: updatedReporting } })

  expect(result.current.model.metrics.find((metric) => metric.id === "profileViews")?.value).toBe("301")
  expect(result.current.model.asOf).toBe(updatedReporting.asOf)
  expect(result.current.model.selectedMetric.id).toBe("ctaInteractions")
})

it("reloads the selected non-default period when the server snapshot changes", async () => {
  const updatedReporting = {
    ...clinicDashboardReportingFixture,
    asOf: "2026-09-18T12:00:00.000Z",
  }
  let currentReporting = clinicDashboardReportingFixture as typeof updatedReporting
  const loadReporting = vi.fn(async (days: 7 | 30 | 90) => ({
    ...currentReporting,
    period: { ...currentReporting.period, days },
  }))
  const { result, rerender } = renderHook(
    ({ initialReporting }: { initialReporting: ClinicDashboardReportingLoadState }) =>
      useDashboardOverviewController({
        initialReporting,
        profileProgress: dashboardProfileProgressReady,
        clinicPreview: { status: "unavailable", name: "Controlled clinic" },
        loadReporting,
      }),
    { initialProps: { initialReporting: { status: "ready", reporting: clinicDashboardReportingFixture } } },
  )
  act(() => result.current.actions.selectMetric("sessionConversion"))
  await act(async () => result.current.actions.changePeriodDays(90))

  currentReporting = updatedReporting
  await act(async () => rerender({ initialReporting: { status: "ready", reporting: updatedReporting } }))

  expect(result.current.model.periodDays).toBe(90)
  expect(result.current.model.asOf).toBe(updatedReporting.asOf)
  expect(result.current.model.selectedMetric.id).toBe("sessionConversion")
  expect(loadReporting).toHaveBeenCalledTimes(2)
})

it("recovers reporting after a server refresh without a manual period change", () => {
  const { result, rerender } = renderHook(
    ({ initialReporting }: { initialReporting: ClinicDashboardReportingLoadState }) =>
      useDashboardOverviewController({
        initialReporting,
        profileProgress: dashboardProfileProgressReady,
        clinicPreview: { status: "unavailable", name: "Controlled clinic" },
      }),
    { initialProps: { initialReporting: { status: "temporarily-unavailable" } } },
  )
  expect(result.current.model.selectedMetric.value).toBe("Not available")

  rerender({ initialReporting: { status: "ready", reporting: clinicDashboardReportingFixture } })

  expect(result.current.model.selectedMetric.value).toBe("284")
  expect(result.current.model.reviews.count).toBe("25")
})
