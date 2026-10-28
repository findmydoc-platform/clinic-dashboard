"use client"

import { useCallback, useState, useSyncExternalStore } from "react"
import { createDashboardOverview } from "../dashboard-overview.mapper"
import type {
  ClinicDashboardReporting,
  ClinicDashboardReportingLoadState,
  ClinicDashboardReportingPeriodDays,
} from "../model/clinic-dashboard-reporting"
import type { DashboardClinicPreview, DashboardJourneyStageId } from "../model/dashboard-overview"
import type { DashboardProfileProgressState } from "../model/profile-progress"
import { useClinicDashboardReportingController } from "./useClinicDashboardReportingController"
import { loadClinicDashboardReportingFromBrowser } from "../browser/reporting-api"
import {
  parseReportingSelection,
  readReportingSelectionSnapshot,
  rememberReportingSelection,
  subscribeReportingSelection,
  type DashboardReportingSelection,
} from "../browser/reporting-selection"

const serverSelectionSnapshot = () => null

type DashboardOverviewControllerInput = Readonly<{
  clinicId?: string
  preferenceScope?: string
  initialReporting: ClinicDashboardReportingLoadState
  profileProgress: DashboardProfileProgressState
  clinicPreview: DashboardClinicPreview
  loadReporting?: (days: ClinicDashboardReportingPeriodDays) => Promise<ClinicDashboardReporting | undefined>
}>

export function useDashboardOverviewController({
  clinicId,
  preferenceScope,
  initialReporting,
  profileProgress,
  clinicPreview,
  loadReporting,
}: DashboardOverviewControllerInput) {
  const snapshot = useSyncExternalStore(
    subscribeReportingSelection,
    readReportingSelectionSnapshot,
    serverSelectionSnapshot,
  )
  const [override, setOverride] =
    useState<Readonly<{ scope: string | undefined; selection: DashboardReportingSelection }>>()
  const selection =
    override && override.scope === preferenceScope
      ? override.selection
      : (parseReportingSelection(preferenceScope, snapshot) ?? {
          periodDays: initialReporting.status === "ready" ? initialReporting.reporting.period.days : 30,
          metricId: "profileViews" as const,
        })
  const remember = (next: DashboardReportingSelection) => {
    setOverride({ scope: preferenceScope, selection: next })
    rememberReportingSelection(preferenceScope, next)
  }
  const defaultLoadReporting = useCallback(
    (days: ClinicDashboardReportingPeriodDays) =>
      clinicId ? loadClinicDashboardReportingFromBrowser(clinicId, days) : Promise.resolve(undefined),
    [clinicId],
  )
  const reporting = useClinicDashboardReportingController({
    initialReporting,
    loadReporting: loadReporting ?? defaultLoadReporting,
    selectedPeriodDays: selection.periodDays,
  })
  const selectMetric = (metricId: DashboardJourneyStageId) => remember({ ...selection, metricId })
  const changePeriodDays = (periodDays: ClinicDashboardReportingPeriodDays) => {
    remember({ ...selection, periodDays })
    return reporting.actions.changePeriodDays(periodDays)
  }
  return {
    actions: { changePeriodDays, selectMetric },
    model: createDashboardOverview({
      reporting: reporting.model,
      periodDays: reporting.model.periodDays,
      selectedMetricId: selection.metricId,
      profileProgress,
      clinicPreview,
    }),
  } as const
}
