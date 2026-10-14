import type { ClinicProfileImageSource } from "@/features/clinic-dashboard/clinic-profile/public"
import type { ClinicDashboardReportingPeriodDays } from "./clinic-dashboard-reporting"
import type { DashboardProfileProgressState } from "./profile-progress"

export type DashboardReportingMetricId =
  "profileViews" | "ctaInteractions" | "inquiries" | "sessionConversion"

export type DashboardOverviewMetric = Readonly<{
  id: DashboardReportingMetricId | "completion"
  label: string
  value: string
  availability: "available" | "loading" | "unavailable"
  comparison?: string
  detail?: string
  information?: string
  progress?: number
}>

export type DashboardClinicPreview =
  | Readonly<{ status: "unavailable"; name: string }>
  | Readonly<{
      status: "available"
      name: string
      location: string
      imageStatus: "available" | "empty" | "unavailable"
      coverImage?: ClinicProfileImageSource
      coverAlt?: string
      ratingLabel?: string
    }>

export type DashboardReviewSummary = Readonly<{
  average: string
  count: string
  rating: number | null
  detail: string
}>

export type DashboardSessionFunnel = Readonly<{
  profileSessions: string
  convertedSessions: string
  conversion?: string
  comparison?: string
  detail?: string
  information: string
}>

export type DashboardOverviewModel = Readonly<{
  clinicPreview: DashboardClinicPreview
  metrics: readonly DashboardOverviewMetric[]
  periodDays: ClinicDashboardReportingPeriodDays
  profileProgress: DashboardProfileProgressState
  reportingStatus: "ready" | "loading" | "temporarily-unavailable"
  selectedMetric: DashboardOverviewMetric
  ctaBreakdown: readonly Readonly<{ label: string; value: string; detail?: string }>[]
  reviews: DashboardReviewSummary
  sessionFunnel: DashboardSessionFunnel
  timezone: "Europe/Istanbul"
  asOf?: string
}>
