import type { DashboardProfileTask } from "./profile-tasks"
import type { DashboardMetricSelection } from "./dashboard-metric-selection"
import type { DashboardReportingSnapshot, DashboardSelectableMetricId } from "./reporting"

export type DashboardLocationSummary = Readonly<{
  location: string
  name: string
}>

export type DashboardViewModel = Readonly<{
  clinicPreview: DashboardLocationSummary &
    Readonly<{
      ratingLabel: string
    }>
  profileCompletion: string
  profileTasks: readonly DashboardProfileTask[]
  rating: Readonly<{
    categories: readonly string[]
    count: number
    pendingResponses: number
    value: number
  }>
  reporting: DashboardReportingSnapshot
  selectedMetric: DashboardMetricSelection
}>

export type DashboardActions = Readonly<{
  onMetricSelect: (metricId: DashboardSelectableMetricId) => void
  onProfileTaskOpen: (task: DashboardProfileTask) => void
  onProfileViewsDownload: () => void
  onReviewsOpen: () => void
}>
