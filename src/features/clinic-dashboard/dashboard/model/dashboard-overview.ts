import type { ClinicProfileImageSource } from "@/features/clinic-dashboard/clinic-profile/public"
import type { ClinicDashboardReportingPeriodDays } from "./clinic-dashboard-reporting"
import type { DashboardProfileProgressState } from "./profile-progress"

export type DashboardJourneyStageId = "impressions" | "profileViews" | "uniqueVisitors" | "inquiries"

export type DashboardJourneyStage = Omit<DashboardOverviewMetric, "id"> &
  Readonly<{ id: DashboardJourneyStageId }>

export type DashboardOverviewMetric = Readonly<{
  id: DashboardJourneyStageId | "completion"
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

export type DashboardOverviewModel = Readonly<{
  clinicPreview: DashboardClinicPreview
  metrics: readonly DashboardOverviewMetric[]
  periodDays: ClinicDashboardReportingPeriodDays
  profileProgress: DashboardProfileProgressState
  reportingStatus: "ready" | "loading" | "temporarily-unavailable"
  journey: readonly DashboardJourneyStage[]
  selectedMetric: DashboardJourneyStage
  reviews: DashboardReviewSummary
  timezone: "Europe/Istanbul"
  asOf?: string
}>
