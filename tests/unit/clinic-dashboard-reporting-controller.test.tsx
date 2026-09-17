// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useClinicDashboardReportingController } from "@/features/clinic-dashboard/dashboard/hooks/useClinicDashboardReportingController"
import type { ClinicDashboardReporting } from "@/features/clinic-dashboard/dashboard/model/clinic-dashboard-reporting"
import {
  clinicDashboardReportingFixture,
  clinicDashboardReportingWithSourceUnavailable,
} from "@/features/clinic-dashboard/dashboard/testing/clinic-dashboard-reporting.fixtures"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("clinic dashboard reporting controller", () => {
  it("clears the previous period while a new period loads and keeps unknown values unknown", async () => {
    let resolveLoad: ((value: typeof clinicDashboardReportingWithSourceUnavailable) => void) | undefined
    const loadReporting = vi.fn(
      () =>
        new Promise<typeof clinicDashboardReportingWithSourceUnavailable>((resolve) => {
          resolveLoad = resolve
        }),
    )
    const { result } = renderHook(() =>
      useClinicDashboardReportingController({
        initialReporting: { reporting: clinicDashboardReportingFixture, status: "ready" },
        loadReporting,
      }),
    )

    expect(result.current.model).toMatchObject({
      periodDays: 30,
      reporting: clinicDashboardReportingFixture,
      status: "ready",
    })

    act(() => {
      void result.current.actions.changePeriodDays(7)
    })

    expect(result.current.model).toEqual({ periodDays: 7, status: "loading" })
    expect(loadReporting).toHaveBeenCalledWith(7)

    act(() => resolveLoad?.(clinicDashboardReportingWithSourceUnavailable))

    await waitFor(() => {
      expect(result.current.model).toEqual({
        periodDays: 7,
        reporting: clinicDashboardReportingWithSourceUnavailable,
        status: "ready",
      })
    })
    if (result.current.model.status !== "ready") throw new Error("Expected reporting to load")
    expect(result.current.model.reporting.metrics.profileViews.current).toEqual({
      state: "source_unavailable",
      value: null,
    })
  })

  it("keeps a failed period distinct from a known zero", async () => {
    const loadReporting = vi.fn(async () => undefined)
    const { result } = renderHook(() =>
      useClinicDashboardReportingController({
        initialReporting: { reporting: clinicDashboardReportingFixture, status: "ready" },
        loadReporting,
      }),
    )

    await act(async () => {
      await result.current.actions.changePeriodDays(90)
    })

    expect(result.current.model).toEqual({ periodDays: 90, status: "temporarily-unavailable" })
  })

  it("keeps the newest period when an earlier request resolves last", async () => {
    const resolvers = new Map<number, (reporting: ClinicDashboardReporting | undefined) => void>()
    const loadReporting = vi.fn(
      (periodDays: 7 | 30 | 90) =>
        new Promise<ClinicDashboardReporting | undefined>((resolve) => {
          resolvers.set(periodDays, resolve)
        }),
    )
    const reportingFor7Days = {
      ...clinicDashboardReportingFixture,
      comparisonPeriod: { ...clinicDashboardReportingFixture.comparisonPeriod, days: 7 },
      period: { ...clinicDashboardReportingFixture.period, days: 7 },
    } as const satisfies ClinicDashboardReporting
    const reportingFor90Days = {
      ...clinicDashboardReportingFixture,
      comparisonPeriod: { ...clinicDashboardReportingFixture.comparisonPeriod, days: 90 },
      metrics: {
        ...clinicDashboardReportingFixture.metrics,
        profileViews: {
          ...clinicDashboardReportingFixture.metrics.profileViews,
          current: { state: "available", value: 902 },
        },
      },
      period: { ...clinicDashboardReportingFixture.period, days: 90 },
    } as const satisfies ClinicDashboardReporting
    const { result } = renderHook(() =>
      useClinicDashboardReportingController({
        initialReporting: { reporting: clinicDashboardReportingFixture, status: "ready" },
        loadReporting,
      }),
    )

    act(() => {
      void result.current.actions.changePeriodDays(7)
      void result.current.actions.changePeriodDays(90)
    })

    expect(result.current.model).toEqual({ periodDays: 90, status: "loading" })

    act(() => resolvers.get(90)?.(reportingFor90Days))

    await waitFor(() => {
      expect(result.current.model).toEqual({
        periodDays: 90,
        reporting: reportingFor90Days,
        status: "ready",
      })
    })

    act(() => resolvers.get(7)?.(reportingFor7Days))

    await waitFor(() => {
      expect(result.current.model).toEqual({
        periodDays: 90,
        reporting: reportingFor90Days,
        status: "ready",
      })
    })
  })
})
