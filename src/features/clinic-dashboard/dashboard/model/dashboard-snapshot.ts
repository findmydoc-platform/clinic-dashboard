import type { DashboardViewModel } from "./dashboard-view-model"
import type { DashboardProfileTask } from "./profile-tasks"
import type { DashboardReportingSnapshots } from "./reporting"

export type DashboardSnapshot = Readonly<{
  profileCompletion: number
  profileTasks: readonly DashboardProfileTask[]
  rating: DashboardViewModel["rating"]
  reporting: DashboardReportingSnapshots
}>
