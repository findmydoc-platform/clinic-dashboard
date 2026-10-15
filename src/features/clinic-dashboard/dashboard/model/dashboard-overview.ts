import type { ClinicProfileImageSource } from "@/features/clinic-dashboard/clinic-profile/public"
import type { ClinicDashboardReportingPeriodDays } from "./clinic-dashboard-reporting"
import type { DashboardProfileProgressState } from "./profile-progress"

export type DashboardJourneyStageId =
  "impressions" | "profileViews" | "uniqueVisitors" | "contacts" | "inquiries"

// Presentation-only capabilities. Unsupported journey stages never enter the reporting contract.
export type DashboardJourneyStage =
  | (Omit<DashboardOverviewMetric, "id"> & Readonly<{ id: "profileViews" | "inquiries" }>)
  | Readonly<{
      id: "impressions" | "uniqueVisitors" | "contacts"
      label: string
      availability: "unsupported"
      value: "Not supported yet"
      information: string
      comparison?: never
      detail?: never
    }>

export type DashboardOverviewMetric = Readonly<{
  id: "profileViews" | "inquiries" | "completion"
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

export type DashboardSessionConversionSummary = Readonly<{
  profileSessions: string
  convertedSessions: string
  conversion?: string
  comparison?: string
  detail?: string
  information: string
}>

export type DashboardOverviewModel = Readonly<{
  clinicPreview: DashboardClinicPreview
  metrics: readonly (
    DashboardOverviewMetric | Extract<DashboardJourneyStage, { availability: "unsupported" }>
  )[]
  periodDays: ClinicDashboardReportingPeriodDays
  profileProgress: DashboardProfileProgressState
  reportingStatus: "ready" | "loading" | "temporarily-unavailable"
  journey: readonly DashboardJourneyStage[]
  selectedMetric: DashboardJourneyStage
  reviews: DashboardReviewSummary
  sessionConversionSummary: DashboardSessionConversionSummary
  timezone: "Europe/Istanbul"
  asOf?: string
}>
