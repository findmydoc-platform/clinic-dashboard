import type { DashboardLocationSummary, DashboardViewModel } from "./model/dashboard-view-model"
import { createDashboardMetricSelection } from "./model/dashboard-metric-selection"
import type { DashboardSnapshot } from "./model/dashboard-snapshot"
import type { DashboardProfileProgressState } from "./model/profile-progress"
import type { DashboardReportingPeriod, DashboardSelectableMetricId } from "./model/reporting"

export function createDashboardViewModel(
  snapshot: DashboardSnapshot,
  period: DashboardReportingPeriod,
  locationSummary: DashboardLocationSummary,
  profileProgress: DashboardProfileProgressState,
  selectedMetricId: DashboardSelectableMetricId = "views",
): DashboardViewModel {
  const reporting = snapshot.reporting[period]

  return {
    clinicPreview: {
      ...(locationSummary.coverAlt ? { coverAlt: locationSummary.coverAlt } : {}),
      ...(locationSummary.coverImage ? { coverImage: locationSummary.coverImage } : {}),
      location: locationSummary.location,
      name: locationSummary.name,
      ratingLabel: `${snapshot.rating.value.toFixed(1)} ★`,
    },
    profileProgress,
    rating: snapshot.rating,
    reporting,
    selectedMetric: createDashboardMetricSelection(reporting, selectedMetricId),
  }
}
