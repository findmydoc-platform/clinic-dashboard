import type {
  ClinicDashboardReportingLoadState,
  ClinicDashboardReportingPeriodDays,
} from "./model/clinic-dashboard-reporting"
import {
  createCountMetricDisplay,
  createMetricValueDisplay,
  createSessionConversionDisplay,
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
  "Analytics include only sessions with consent. Repeated profile-view events count separately. Sessions are not unique people or patients."
const sessionInformation =
  "Consent-limited sessions with a profile view followed by a successfully stored inquiry for the same clinic. Each session counts at most once. CTA interactions are not a required conversion step."
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
  const supportedStage = (id: "profileViews" | "inquiries"): DashboardJourneyStage => {
    const display = reporting
      ? createCountMetricDisplay(reporting.metrics[id])
      : { value: missingValue, detail: missingDetail }
    return {
      ...display,
      id,
      label: id === "profileViews" ? "Profile views" : "Inquiries",
      availability:
        reporting?.metrics[id].current.state === "available"
          ? "available"
          : loadState.status === "loading"
            ? "loading"
            : "unavailable",
      information: [
        id === "inquiries"
          ? "Stored inquiries created in the selected period, excluding spam. This is not an inventory of open work."
          : consentInformation,
        display.information,
      ]
        .filter(Boolean)
        .join(" "),
    }
  }
  const conversion = reporting?.metrics.sessionConversion.current
  const conversionDisplay = reporting
    ? createSessionConversionDisplay(reporting.metrics.sessionConversion)
    : undefined
  const sessionState = conversion?.state === "zero_denominator" ? "available" : conversion?.state
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
    {
      id: "uniqueVisitors",
      label: "Unique visitors",
      availability: "unsupported",
      value: "Not supported yet",
      information: "Unique visitors are not measured. Session counts are not unique-visitor counts.",
    },
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
    reportingStatus: loadState.status,
    journey,
    selectedMetric: journey.find((stage) => stage.id === selectedMetricId) ?? journey[1],
    reviews: {
      average: reviewDisplay.value,
      count: reviewCount,
      rating,
      detail: reviewDisplay.detail ?? "Current public reviews",
    },
    sessionConversionSummary: {
      profileSessions: sessionState
        ? createMetricValueDisplay({ state: sessionState, value: conversion?.denominatorSessions ?? null })
            .value
        : missingValue,
      convertedSessions: sessionState
        ? createMetricValueDisplay({ state: sessionState, value: conversion?.numeratorSessions ?? null })
            .value
        : missingValue,
      conversion:
        conversion?.state === "available" && conversion.ratePercent !== null
          ? conversionDisplay?.value
          : undefined,
      comparison: conversionDisplay?.comparison,
      detail: conversionDisplay?.detail ?? (!reporting ? missingDetail : undefined),
      information: [sessionInformation, conversionDisplay?.information].filter(Boolean).join(" "),
    },
    timezone: "Europe/Istanbul",
    asOf: reporting?.asOf,
  }
}
