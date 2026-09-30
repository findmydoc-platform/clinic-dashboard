"use client"

import { loadClinicDashboardReportingFromBrowser } from "./browser/reporting-api"
import { DashboardReportingScreen } from "./components/organisms/DashboardReportingScreen"
import { useClinicDashboardReportingController } from "./hooks/useClinicDashboardReportingController"
import type { ClinicDashboardReportingLoadState } from "./model/clinic-dashboard-reporting"

export type ClinicDashboardReportingControllerProps = Readonly<{
  initialReporting?: ClinicDashboardReportingLoadState
}>

export function ClinicDashboardReportingController({
  initialReporting,
}: ClinicDashboardReportingControllerProps) {
  const controller = useClinicDashboardReportingController({
    initialReporting: initialReporting ?? { status: "temporarily-unavailable" },
    loadReporting: loadClinicDashboardReportingFromBrowser,
  })

  return (
    <DashboardReportingScreen model={controller.model} onPeriodChange={controller.actions.changePeriodDays} />
  )
}
