"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
  const snapshotKey = JSON.stringify(initialReporting)
  const serverPeriod = initialReporting.status === "ready" ? initialReporting.reporting.period.days : 30
  const [state, setState] = useState(() => ({
    model: initialModel(initialReporting),
    snapshotKey,
  }))
  const latestRequest = useRef(0)
  const model: ClinicDashboardReportingViewState =
    state.snapshotKey === snapshotKey
      ? state.model
      : state.model.periodDays === serverPeriod
        ? initialModel(initialReporting)
        : { periodDays: state.model.periodDays, status: "loading" }

  const changePeriodDays = useCallback(
    async (periodDays: ClinicDashboardReportingPeriodDays) => {
      const requestId = latestRequest.current + 1
      latestRequest.current = requestId
      setState({ model: { periodDays, status: "loading" }, snapshotKey })

      const reporting = await loadReporting(periodDays).catch(() => undefined)
      if (latestRequest.current !== requestId) return

      setState({
        model: reporting
          ? { periodDays, reporting, status: "ready" }
          : { periodDays, status: "temporarily-unavailable" },
        snapshotKey,
      })
    },
    [loadReporting, snapshotKey],
  )

  useEffect(() => {
    if (state.snapshotKey === snapshotKey || state.model.periodDays === serverPeriod) return
    const periodDays = state.model.periodDays
    const requestId = latestRequest.current + 1
    latestRequest.current = requestId
    let active = true
    void loadReporting(periodDays)
      .catch(() => undefined)
      .then((reporting) => {
        if (!active || latestRequest.current !== requestId) return
        setState({
          model: reporting
            ? { periodDays, reporting, status: "ready" }
            : { periodDays, status: "temporarily-unavailable" },
          snapshotKey,
        })
      })
    return () => {
      active = false
    }
  }, [loadReporting, serverPeriod, snapshotKey, state.model.periodDays, state.snapshotKey])

  return { actions: { changePeriodDays }, model } as const
}
