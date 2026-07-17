import type { DashboardViewModel } from "./model/dashboard-view-model"
import type { DashboardProfileTask } from "./model/profile-tasks"
import type { DashboardReportingPeriod, DashboardReportingSnapshots } from "./model/reporting"

export type DashboardViewModelSource = Readonly<{
  profileTasks: readonly DashboardProfileTask[]
  rating: DashboardViewModel["rating"]
  reporting: DashboardReportingSnapshots
}>

export function createDashboardPrototypeViewModel(
  data: DashboardViewModelSource,
  period: DashboardReportingPeriod,
): DashboardViewModel {
  return {
    clinicPreview: {
      location: "Mitte, Berlin",
      name: "Berlin Health",
      ratingLabel: "4.8 ★",
    },
    profileCompletion: "82%",
    profileTasks: data.profileTasks,
    rating: data.rating,
    reporting: data.reporting[period],
  }
}
