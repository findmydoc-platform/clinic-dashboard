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
  DashboardReportingMetricId,
} from "./model/dashboard-overview"
import type { DashboardProfileProgressState } from "./model/profile-progress"
import type {
  ClinicProfileSnapshot,
  ClinicGallerySnapshot,
  ClinicGalleryLoadStatus,
} from "@/features/clinic-dashboard/clinic-profile/public"

const consentInformation =
  "Analytics include only sessions with consent. Repeated profile-view and CTA events count separately. Sessions are not unique people or patients."
const sessionInformation =
  "Consent-limited sessions with a profile view followed by a successfully stored inquiry for the same clinic. Each session counts at most once. CTA interactions are not a required conversion step."
const reportingMetricLabels = {
  profileViews: "Profile views",
  ctaInteractions: "CTA interactions",
  inquiries: "Inquiries",
  sessionConversion: "Session conversion",
} as const

type DashboardOverviewInput = Readonly<{
  reporting: ClinicDashboardReportingLoadState | Readonly<{ status: "loading" }>
  periodDays: ClinicDashboardReportingPeriodDays
  profileProgress: DashboardProfileProgressState
  clinicPreview: DashboardClinicPreview
  selectedMetricId: DashboardReportingMetricId
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
  const metrics: DashboardOverviewMetric[] = [completion]
  for (const id of Object.keys(reportingMetricLabels) as DashboardReportingMetricId[]) {
    const display = !reporting
      ? { value: missingValue, detail: missingDetail }
      : id === "sessionConversion"
        ? createSessionConversionDisplay(reporting.metrics.sessionConversion)
        : createCountMetricDisplay(
            id === "ctaInteractions" ? reporting.metrics.ctaInteractions.total : reporting.metrics[id],
          )
    const information =
      id === "inquiries"
        ? "Stored inquiries created in the selected period, excluding spam. This is not an inventory of open work."
        : id === "sessionConversion"
          ? sessionInformation
          : consentInformation
    const state = !reporting
      ? undefined
      : id === "sessionConversion"
        ? reporting.metrics.sessionConversion.current.state
        : id === "ctaInteractions"
          ? reporting.metrics.ctaInteractions.total.current.state
          : reporting.metrics[id].current.state
    metrics.push({
      ...display,
      availability:
        state === "available" ? "available" : loadState.status === "loading" ? "loading" : "unavailable",
      id,
      label: reportingMetricLabels[id],
      information: [information, display.information].filter(Boolean).join(" "),
    })
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

  return {
    clinicPreview:
      clinicPreview.status === "available"
        ? { ...clinicPreview, ratingLabel: rating === null ? undefined : `${rating.toFixed(1)} ★` }
        : clinicPreview,
    metrics,
    periodDays,
    profileProgress,
    reportingStatus: loadState.status,
    selectedMetric: metrics.find((metric) => metric.id === selectedMetricId) ?? metrics[1],
    ctaBreakdown: (
      [
        ["choose_treatment", "Choose a treatment"],
        ["contact", "Contact clinic"],
        ["contact_doctor", "Contact doctor"],
      ] as const
    ).map(([id, label]) => ({
      label,
      ...(reporting
        ? createCountMetricDisplay(reporting.metrics.ctaInteractions.byCtaId[id])
        : { value: missingValue, detail: missingDetail }),
    })),
    reviews: {
      average: reviewDisplay.value,
      count: reviewCount,
      rating,
      detail: reviewDisplay.detail ?? "Current public reviews",
    },
    sessionFunnel: {
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
