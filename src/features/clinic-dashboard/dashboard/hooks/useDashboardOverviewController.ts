"use client"

import { useState } from "react"
import { createDashboardOverview } from "../dashboard-overview.mapper"
import type {
  ClinicDashboardReporting,
  ClinicDashboardReportingLoadState,
  ClinicDashboardReportingPeriodDays,
} from "../model/clinic-dashboard-reporting"
import type { DashboardClinicPreview, DashboardReportingMetricId } from "../model/dashboard-overview"
import type { DashboardProfileProgressState } from "../model/profile-progress"
import { useClinicDashboardReportingController } from "./useClinicDashboardReportingController"

type DashboardOverviewControllerInput = Readonly<{
  initialReporting: ClinicDashboardReportingLoadState
  profileProgress: DashboardProfileProgressState
  clinicPreview: DashboardClinicPreview
  loadReporting: (days: ClinicDashboardReportingPeriodDays) => Promise<ClinicDashboardReporting | undefined>
}>

export function useDashboardOverviewController({
  initialReporting,
  profileProgress,
  clinicPreview,
  loadReporting,
}: DashboardOverviewControllerInput) {
  const reporting = useClinicDashboardReportingController({ initialReporting, loadReporting })
  const [selectedMetricId, selectMetric] = useState<DashboardReportingMetricId>("profileViews")
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
