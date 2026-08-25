import type { ClinicProfileImageSource } from "@/features/clinic-dashboard/clinic-profile/public"
import type { DashboardMetricSelection } from "./dashboard-metric-selection"
import type { DashboardProfileProgressState } from "./profile-progress"
import type { DashboardProfileTask } from "./profile-tasks"
import type { DashboardReportingSnapshot, DashboardSelectableMetricId } from "./reporting"

export type DashboardLocationSummary = Readonly<{
  coverAlt?: string
  coverImage?: ClinicProfileImageSource
  location: string
  name: string
}>

export type DashboardViewModel = Readonly<{
  clinicPreview: DashboardLocationSummary &
    Readonly<{
      ratingLabel: string
    }>
  profileProgress: DashboardProfileProgressState
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
  onProfileProgressRetry: () => void
  onProfileTaskOpen: (task: DashboardProfileTask) => void
  onProfileViewsDownload: () => void
  onReviewsOpen: () => void
}>
