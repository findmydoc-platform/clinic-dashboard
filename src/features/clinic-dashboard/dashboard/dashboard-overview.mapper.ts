import type {
  ClinicDashboardReportingLoadState,
  ClinicDashboardReportingPeriodDays,
} from "./model/clinic-dashboard-reporting"
import {
  createCountMetricDisplay,
  createMetricValueDisplay,
} from "./model/clinic-dashboard-reporting-display"
import type {
  DashboardClinicPreview,
  DashboardOverviewMetric,
  DashboardOverviewModel,
  DashboardJourneyStage,
  DashboardJourneyStageId,
} from "./model/dashboard-overview"
import type { DashboardProfileProgressState } from "./model/profile-progress"
import type {
  ClinicProfileSnapshot,
  ClinicGallerySnapshot,
  ClinicGalleryLoadStatus,
} from "@/features/clinic-dashboard/clinic-profile/public"

const consentInformation =
  "Analytics include only visitors with consent. Repeated profile-view events count separately."
type DashboardOverviewInput = Readonly<{
  reporting: ClinicDashboardReportingLoadState | Readonly<{ status: "loading" }>
  periodDays: ClinicDashboardReportingPeriodDays
  profileProgress: DashboardProfileProgressState
  clinicPreview: DashboardClinicPreview
  selectedMetricId: DashboardJourneyStageId
}>

export function createDashboardClinicPreview({
  clinicName,
  profile,
  gallery,
  galleryStatus,
}: Readonly<{
  clinicName: string
  profile?: ClinicProfileSnapshot
  gallery?: ClinicGallerySnapshot
  galleryStatus: ClinicGalleryLoadStatus
}>): DashboardClinicPreview {
  if (!profile) return { status: "unavailable", name: clinicName }
  const cover =
    galleryStatus === "ready" ? gallery?.items.find((item) => item.status === "published") : undefined
  return {
    status: "available",
    name: profile.published.name || "Clinic name not published",
    location: profile.published.address.city
      ? `${profile.published.address.city.name}, ${profile.published.address.country.name}`
      : "Location not published",
    imageStatus: galleryStatus !== "ready" || !gallery ? "unavailable" : cover ? "available" : "empty",
    ...(cover ? { coverImage: cover.thumbnailUrl ?? cover.url, coverAlt: cover.alt } : {}),
  }
}

export function createDashboardOverview({
  reporting: loadState,
  periodDays,
  profileProgress,
  clinicPreview,
  selectedMetricId,
}: DashboardOverviewInput): DashboardOverviewModel {
  const reporting = loadState.status === "ready" ? loadState.reporting : undefined
  const missingValue = loadState.status === "loading" ? "Loading" : "Not available"
  const missingDetail =
    loadState.status === "loading" ? "Loading reporting" : "Reporting temporarily unavailable"
  const completion: DashboardOverviewMetric = {
    id: "completion",
    availability:
      profileProgress.status === "ready"
        ? "available"
        : profileProgress.status === "loading"
          ? "loading"
          : "unavailable",
    label: "Public profile completion",
    value:
      profileProgress.status === "ready"
        ? `${profileProgress.percent}%`
        : profileProgress.status === "loading"
          ? "Loading"
          : "Not available",
    progress: profileProgress.status === "ready" ? profileProgress.percent : undefined,
    detail:
      profileProgress.status === "ready"
        ? `${profileProgress.completedAreaCount} of 6 profile areas complete`
        : profileProgress.status === "error"
          ? profileProgress.message
          : "Loading public profile",
  }
  const supportedStage = (id: "profileViews" | "uniqueVisitors" | "inquiries"): DashboardJourneyStage => {
    const display = reporting
      ? createCountMetricDisplay(reporting.metrics[id])
      : { value: missingValue, detail: missingDetail }
    return {
      ...display,
      id,
      label:
        id === "profileViews" ? "Profile views" : id === "uniqueVisitors" ? "Unique visitors" : "Inquiries",
      availability:
        reporting?.metrics[id].current.state === "available"
          ? "available"
          : loadState.status === "loading"
            ? "loading"
            : "unavailable",
      information: [
        id === "inquiries"
          ? "Stored inquiries created in the selected period, excluding spam. This is not an inventory of open work."
          : id === "uniqueVisitors"
            ? "Distinct recognized browser visitors among profile views, once per clinic and period, using the same consent-based browser recognition as Inquiry starters. Browser or device changes and cleared storage can count a visitor again. Visitors without analytics consent are not measured. Patient, inquiry and session identifiers are not used."
            : consentInformation,
        display.information,
      ]
        .filter(Boolean)
        .join(" "),
    }
  }
  const reviewCount = reporting
    ? createMetricValueDisplay(reporting.metrics.reviews.count).value
    : missingValue
  const reviewAverage = reporting?.metrics.reviews.average
  const reviewDisplay = reviewAverage
    ? reviewAverage.state === "no_reviews"
      ? { value: "No reviews yet", detail: "No public reviews are available." }
      : {
          ...createMetricValueDisplay({ state: reviewAverage.state, value: reviewAverage.value }),
          value:
            reviewAverage.state === "available" && reviewAverage.value !== null
              ? `${reviewAverage.value.toFixed(1)} / 5`
              : "Not available",
        }
    : { value: missingValue, detail: missingDetail }
  const rating = reviewAverage?.state === "available" ? reviewAverage.value : null
  const journey: DashboardJourneyStage[] = [
    {
      id: "impressions",
      label: "Impressions",
      availability: "unsupported",
      value: "Not supported yet",
      information: "Search impressions are not measured by the current reporting capability.",
    },
    supportedStage("profileViews"),
    supportedStage("uniqueVisitors"),
    {
      id: "contacts",
      label: "Contacts",
      availability: "unsupported",
      value: "Not supported yet",
      information:
        "Chat conversations are not measured. Contact-button clicks are a separate CTA measurement.",
    },
    supportedStage("inquiries"),
  ]

  return {
    clinicPreview:
      clinicPreview.status === "available"
        ? { ...clinicPreview, ratingLabel: rating === null ? undefined : `${rating.toFixed(1)} ★` }
        : clinicPreview,
    metrics: [completion, ...journey.filter((stage) => stage.id !== "uniqueVisitors")],
    periodDays,
    profileProgress,
    reportingStatus:
      loadState.status === "access-denied" || loadState.status === "unauthorized"
        ? "temporarily-unavailable"
        : loadState.status,
    journey,
    selectedMetric: journey.find((stage) => stage.id === selectedMetricId) ?? journey[1],
    reviews: {
      average: reviewDisplay.value,
      count: reviewCount,
      rating,
      detail: reviewDisplay.detail ?? "Current public reviews",
    },
    timezone: "Europe/Istanbul",
    asOf: reporting?.asOf,
  }
}
