"use client"

import { useCallback, useState } from "react"
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

type DashboardOverviewControllerInput = Readonly<{
  clinicId?: string
  initialReporting: ClinicDashboardReportingLoadState
  profileProgress: DashboardProfileProgressState
  clinicPreview: DashboardClinicPreview
  loadReporting?: (days: ClinicDashboardReportingPeriodDays) => Promise<ClinicDashboardReporting | undefined>
}>

export function useDashboardOverviewController({
  clinicId,
  initialReporting,
  profileProgress,
  clinicPreview,
  loadReporting,
}: DashboardOverviewControllerInput) {
  const defaultLoadReporting = useCallback(
    (days: ClinicDashboardReportingPeriodDays) =>
      clinicId ? loadClinicDashboardReportingFromBrowser(clinicId, days) : Promise.resolve(undefined),
    [clinicId],
  )
  const reporting = useClinicDashboardReportingController({
    initialReporting,
    loadReporting: loadReporting ?? defaultLoadReporting,
  })
  const [selectedMetricId, selectMetric] = useState<DashboardJourneyStageId>("profileViews")
  return {
    actions: { ...reporting.actions, selectMetric },
    model: createDashboardOverview({
      reporting: reporting.model,
      periodDays: reporting.model.periodDays,
      selectedMetricId,
      profileProgress,
      clinicPreview,
    }),
  } as const
}
