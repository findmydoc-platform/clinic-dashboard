import type { DashboardViewModel } from "./model/dashboard-view-model"
import type { DashboardSnapshot } from "./model/dashboard-snapshot"
import type { DashboardReportingPeriod } from "./model/reporting"

export function createDashboardPrototypeViewModel(
  snapshot: DashboardSnapshot,
  period: DashboardReportingPeriod,
): DashboardViewModel {
  return {
    clinicPreview: {
      location: "Mitte, Berlin",
      name: "Berlin Health",
      ratingLabel: "4.8 ★",
    },
    profileCompletion: "82%",
    profileTasks: snapshot.profileTasks,
    rating: snapshot.rating,
    reporting: snapshot.reporting[period],
  }
}
