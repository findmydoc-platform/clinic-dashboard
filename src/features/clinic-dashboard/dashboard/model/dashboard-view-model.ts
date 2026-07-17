import type { DashboardProfileTask } from "./profile-tasks"
import type { DashboardReportingSnapshot } from "./reporting"

export type DashboardViewModel = Readonly<{
  clinicPreview: Readonly<{
    location: string
    name: string
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
}>

export type DashboardActions = Readonly<{
  onProfileTaskOpen: (task: DashboardProfileTask) => void
  onProfileViewsDownload: () => void
  onReviewsOpen: () => void
}>
