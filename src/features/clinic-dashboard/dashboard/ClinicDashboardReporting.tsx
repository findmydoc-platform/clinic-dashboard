"use client"

import { DashboardOverviewScreen } from "./components/organisms/DashboardOverviewScreen"
import { ReportingPeriodControl } from "./components/molecules/ReportingPeriodControl"
import { useDashboardOverviewController } from "./hooks/useDashboardOverviewController"
import type {
  ClinicDashboardReporting,
  ClinicDashboardReportingLoadState,
  ClinicDashboardReportingPeriodDays,
} from "./model/clinic-dashboard-reporting"
import type { DashboardClinicPreview } from "./model/dashboard-overview"
import type { DashboardProfileProgressState } from "./model/profile-progress"
import type { DashboardProfileTask } from "./model/profile-tasks"

type ClinicDashboardReportingControllerProps = Readonly<{
  initialReporting?: ClinicDashboardReportingLoadState
  profileProgress: DashboardProfileProgressState
  clinicPreview: DashboardClinicPreview
  loadReporting?: (days: ClinicDashboardReportingPeriodDays) => Promise<ClinicDashboardReporting | undefined>
  onProfileTaskOpen: (task: DashboardProfileTask) => void
  onProfileProgressRetry: () => void
  onReviewsOpen: () => void
}>

export function ClinicDashboardReportingController({
  initialReporting,
  profileProgress,
  clinicPreview,
  loadReporting,
  onProfileTaskOpen,
  onProfileProgressRetry,
  onReviewsOpen,
}: ClinicDashboardReportingControllerProps) {
  const controller = useDashboardOverviewController({
    initialReporting: initialReporting ?? { status: "temporarily-unavailable" },
    profileProgress,
    clinicPreview,
    loadReporting,
  })

  return (
    <div className="space-y-4">
      <ReportingPeriodControl
        value={controller.model.periodDays}
        onValueChange={controller.actions.changePeriodDays}
        disabled={controller.model.reportingStatus === "loading"}
      />
      <DashboardOverviewScreen
        model={controller.model}
        onMetricSelect={controller.actions.selectMetric}
        onProfileTaskOpen={onProfileTaskOpen}
        onProfileProgressRetry={onProfileProgressRetry}
        onReviewsOpen={onReviewsOpen}
        onReportingRetry={() => void controller.actions.changePeriodDays(controller.model.periodDays)}
      />
    </div>
  )
}
