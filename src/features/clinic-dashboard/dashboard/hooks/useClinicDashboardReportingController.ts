"use client"

import { useCallback, useRef, useState } from "react"
import type {
  ClinicDashboardReporting,
  ClinicDashboardReportingLoadState,
  ClinicDashboardReportingPeriodDays,
} from "../model/clinic-dashboard-reporting"

export type ClinicDashboardReportingViewState =
  | Readonly<{
      periodDays: ClinicDashboardReportingPeriodDays
      reporting: ClinicDashboardReporting
      status: "ready"
    }>
  | Readonly<{
      periodDays: ClinicDashboardReportingPeriodDays
      status: "loading" | "temporarily-unavailable"
    }>

type UseClinicDashboardReportingControllerInput = Readonly<{
  initialReporting: ClinicDashboardReportingLoadState
  loadReporting: (
    periodDays: ClinicDashboardReportingPeriodDays,
  ) => Promise<ClinicDashboardReporting | undefined>
}>

function initialModel(
  initialReporting: ClinicDashboardReportingLoadState,
): ClinicDashboardReportingViewState {
  return initialReporting.status === "ready"
    ? {
        periodDays: initialReporting.reporting.period.days,
        reporting: initialReporting.reporting,
        status: "ready",
      }
    : { periodDays: 30, status: "temporarily-unavailable" }
}

export function useClinicDashboardReportingController({
  initialReporting,
  loadReporting,
}: UseClinicDashboardReportingControllerInput) {
  const [model, setModel] = useState<ClinicDashboardReportingViewState>(() => initialModel(initialReporting))
  const latestRequest = useRef(0)

  const changePeriodDays = useCallback(
    async (periodDays: ClinicDashboardReportingPeriodDays) => {
      const requestId = latestRequest.current + 1
      latestRequest.current = requestId
      setModel({ periodDays, status: "loading" })

      const reporting = await loadReporting(periodDays).catch(() => undefined)
      if (latestRequest.current !== requestId) return

      setModel(
        reporting
          ? { periodDays, reporting, status: "ready" }
          : { periodDays, status: "temporarily-unavailable" },
      )
    },
    [loadReporting],
  )

  return { actions: { changePeriodDays }, model } as const
}
