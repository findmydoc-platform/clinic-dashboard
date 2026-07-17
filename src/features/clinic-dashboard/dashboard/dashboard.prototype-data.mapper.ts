import type { DashboardLocationSummary, DashboardViewModel } from "./model/dashboard-view-model"
import { createDashboardMetricSelection } from "./model/dashboard-metric-selection"
import type { DashboardSnapshot } from "./model/dashboard-snapshot"
import type { DashboardReportingPeriod, DashboardSelectableMetricId } from "./model/reporting"

export function createDashboardPrototypeViewModel(
  snapshot: DashboardSnapshot,
  period: DashboardReportingPeriod,
  locationSummary: DashboardLocationSummary,
  selectedMetricId: DashboardSelectableMetricId = "views",
): DashboardViewModel {
  const reporting = snapshot.reporting[period]

  return {
    clinicPreview: {
      location: locationSummary.location,
      name: locationSummary.name,
      ratingLabel: "4.8 ★",
    },
    profileCompletion: "82%",
    profileTasks: snapshot.profileTasks,
    rating: snapshot.rating,
    reporting,
    selectedMetric: createDashboardMetricSelection(reporting, selectedMetricId),
  }
}
