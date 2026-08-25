import type { DashboardViewModel } from "./dashboard-view-model"
import type { DashboardReportingSnapshots } from "./reporting"

export type DashboardSnapshot = Readonly<{
  rating: DashboardViewModel["rating"]
  reporting: DashboardReportingSnapshots
}>
