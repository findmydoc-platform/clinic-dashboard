import type { DashboardLocationSummary, DashboardViewModel } from "./model/dashboard-view-model"
import type { DashboardSnapshot } from "./model/dashboard-snapshot"
import type { DashboardReportingPeriod } from "./model/reporting"

export function createDashboardPrototypeViewModel(
  snapshot: DashboardSnapshot,
  period: DashboardReportingPeriod,
  locationSummary: DashboardLocationSummary,
): DashboardViewModel {
  return {
    clinicPreview: {
      location: locationSummary.location,
      name: locationSummary.name,
      ratingLabel: "4.8 ★",
    },
    profileCompletion: "82%",
    profileTasks: snapshot.profileTasks,
    rating: snapshot.rating,
    reporting: snapshot.reporting[period],
  }
}
