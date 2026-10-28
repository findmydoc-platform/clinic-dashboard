// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { useDashboardOverviewController } from "@/features/clinic-dashboard/dashboard/hooks/useDashboardOverviewController"
import { clinicDashboardReportingFixture } from "@/features/clinic-dashboard/dashboard/testing/clinic-dashboard-reporting.fixtures"
import { dashboardProfileProgressReady } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"
import type {
  ClinicDashboardReporting,
  ClinicDashboardReportingLoadState,
} from "@/features/clinic-dashboard/dashboard/model/clinic-dashboard-reporting"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.sessionStorage.clear()
})

const useScopedReporting = (
  scope: string,
  loadReporting?: (days: 7 | 30 | 90) => Promise<ClinicDashboardReporting>,
) =>
  useDashboardOverviewController({
    preferenceScope: scope,
    initialReporting: { status: "ready", reporting: clinicDashboardReportingFixture },
    profileProgress: dashboardProfileProgressReady,
    clinicPreview: { status: "unavailable", name: "Controlled clinic" },
    loadReporting,
  })

it("restores the tab's selection with fresh matching-period data after remount", async () => {
  const loadReporting = vi.fn(async (days: 7 | 30 | 90) => ({
    ...clinicDashboardReportingFixture,
    period: { ...clinicDashboardReportingFixture.period, days },
  }))
  const first = renderHook(() => useScopedReporting("principal:clinic", loadReporting))
  act(() => first.result.current.actions.selectMetric("inquiries"))
  await act(async () => first.result.current.actions.changePeriodDays(90))
  first.unmount()

  let resolve!: (value: ClinicDashboardReporting) => void
  const freshLoad = vi.fn(
    () =>
      new Promise<ClinicDashboardReporting>((done) => {
        resolve = done
      }),
  )
  const restored = renderHook(() => useScopedReporting("principal:clinic", freshLoad))
  expect(restored.result.current.model.periodDays).toBe(90)
  expect(restored.result.current.model.selectedMetric.id).toBe("inquiries")
  expect(restored.result.current.model.reportingStatus).toBe("loading")
  expect(restored.result.current.model.metrics.find((metric) => metric.id === "profileViews")?.value).toBe(
    "Loading",
  )
  expect(freshLoad).toHaveBeenCalledExactlyOnceWith(90)
  await act(async () =>
    resolve({
      ...clinicDashboardReportingFixture,
      period: { ...clinicDashboardReportingFixture.period, days: 90 },
    }),
  )
  expect(restored.result.current.model.reportingStatus).toBe("ready")
  expect(restored.result.current.model.periodDays).toBe(90)
})

it.each(["other-principal:clinic", "principal:other-clinic"])(
  "does not restore another authenticated scope's selection in %s",
  async (scope) => {
    const loadReporting = vi.fn(async (days: 7 | 30 | 90) => ({
      ...clinicDashboardReportingFixture,
      period: { ...clinicDashboardReportingFixture.period, days },
    }))
    const first = renderHook(() => useScopedReporting("principal:clinic", loadReporting))
    act(() => first.result.current.actions.selectMetric("inquiries"))
    await act(async () => first.result.current.actions.changePeriodDays(90))
    first.unmount()
    loadReporting.mockClear()

    const next = renderHook(() => useScopedReporting(scope, loadReporting))
    expect(next.result.current.model.periodDays).toBe(30)
    expect(next.result.current.model.selectedMetric.id).toBe("profileViews")
    expect(loadReporting).not.toHaveBeenCalled()
  },
)

it.each([
  "{",
  "null",
  JSON.stringify({ scope: "principal:clinic", periodDays: 365, metricId: "inquiries" }),
  JSON.stringify({ scope: "principal:clinic", periodDays: 90, metricId: "unknown" }),
])("ignores invalid stored reporting preferences: %s", (value) => {
  window.sessionStorage.setItem("fmd-dashboard-reporting-selection", value)
  const hook = renderHook(() => useScopedReporting("principal:clinic"))
  expect(hook.result.current.model.periodDays).toBe(30)
  expect(hook.result.current.model.selectedMetric.id).toBe("profileViews")
})

it("keeps reporting usable when browser preference reads and writes are denied", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Storage denied")
  })
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Storage denied")
  })
  const loadReporting = vi.fn(async (days: 7 | 30 | 90) => ({
    ...clinicDashboardReportingFixture,
    period: { ...clinicDashboardReportingFixture.period, days },
  }))
  const hook = renderHook(() => useScopedReporting("principal:clinic", loadReporting))
  act(() => hook.result.current.actions.selectMetric("inquiries"))
  await act(async () => hook.result.current.actions.changePeriodDays(90))
  await waitFor(() => expect(hook.result.current.model.reportingStatus).toBe("ready"))
  expect(hook.result.current.model.periodDays).toBe(90)
  expect(hook.result.current.model.selectedMetric.id).toBe("inquiries")
  expect(loadReporting).toHaveBeenCalledExactlyOnceWith(90)
})

it("retains the selected measurement across a reporting period change", async () => {
  const loadReporting = vi.fn(async (days: 7 | 30 | 90) => ({
    ...clinicDashboardReportingFixture,
    period: { ...clinicDashboardReportingFixture.period, days },
  }))
  const { result } = renderHook(() =>
    useDashboardOverviewController({
      initialReporting: { status: "ready", reporting: clinicDashboardReportingFixture },
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: { status: "unavailable", name: "Controlled clinic" },
      loadReporting,
    }),
  )
  act(() => result.current.actions.selectMetric("contacts"))
  expect(loadReporting).not.toHaveBeenCalled()
  await act(async () => {
    await result.current.actions.changePeriodDays(7)
  })
  expect(result.current.model.periodDays).toBe(7)
  expect(result.current.model.selectedMetric.id).toBe("contacts")
  expect(result.current.model.profileProgress).toBe(dashboardProfileProgressReady)
  expect(loadReporting).toHaveBeenCalledExactlyOnceWith(7)
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

  act(() => result.current.actions.selectMetric("uniqueVisitors"))
  rerender({ initialReporting: { status: "ready", reporting: updatedReporting } })

  expect(result.current.model.metrics.find((metric) => metric.id === "profileViews")?.value).toBe("301")
  expect(result.current.model.asOf).toBe(updatedReporting.asOf)
  expect(result.current.model.selectedMetric.id).toBe("uniqueVisitors")
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
  act(() => result.current.actions.selectMetric("inquiries"))
  await act(async () => result.current.actions.changePeriodDays(90))

  currentReporting = updatedReporting
  await act(async () => rerender({ initialReporting: { status: "ready", reporting: updatedReporting } }))

  expect(result.current.model.periodDays).toBe(90)
  expect(result.current.model.asOf).toBe(updatedReporting.asOf)
  expect(result.current.model.selectedMetric.id).toBe("inquiries")
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
