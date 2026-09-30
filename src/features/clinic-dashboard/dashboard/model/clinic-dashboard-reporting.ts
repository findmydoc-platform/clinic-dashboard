export const clinicDashboardReportingPeriodDays = [7, 30, 90] as const

export const clinicDashboardReportingSchemaVersion = "clinic-dashboard-reporting-v1" as const

export type ClinicDashboardReportingPeriodDays = (typeof clinicDashboardReportingPeriodDays)[number]

export type ClinicDashboardReportingSource = "payload" | "posthog"

export type ClinicDashboardReportingSourceState = "available" | "source_unavailable" | "partial_coverage"

export type ClinicDashboardReportingMetricValue = Readonly<{
  state: ClinicDashboardReportingSourceState
  value: number | null
}>

export type ClinicDashboardReportingCountMetric<Source extends ClinicDashboardReportingSource> = Readonly<{
  comparison: ClinicDashboardReportingMetricValue &
    Readonly<{
      absoluteDelta: number | null
      relativeDeltaPercent: number | null
    }>
  current: ClinicDashboardReportingMetricValue
  source: Source
}>

export type ClinicDashboardReportingSessionConversion = Readonly<{
  comparison: Readonly<{
    denominatorSessions: number | null
    numeratorSessions: number | null
    percentagePointDelta: number | null
    ratePercent: number | null
    state: ClinicDashboardReportingSourceState | "zero_denominator"
  }>
  current: Readonly<{
    denominatorSessions: number | null
    numeratorSessions: number | null
    ratePercent: number | null
    state: ClinicDashboardReportingSourceState | "zero_denominator"
  }>
  source: "posthog"
}>

export type ClinicDashboardReporting = Readonly<{
  asOf: string
  comparisonPeriod: Readonly<{
    days: ClinicDashboardReportingPeriodDays
    from: string
    to: string
  }>
  metrics: Readonly<{
    ctaInteractions: Readonly<{
      byCtaId: Readonly<{
        choose_treatment: ClinicDashboardReportingCountMetric<"posthog">
        contact: ClinicDashboardReportingCountMetric<"posthog">
        contact_doctor: ClinicDashboardReportingCountMetric<"posthog">
      }>
      source: "posthog"
      total: ClinicDashboardReportingCountMetric<"posthog">
    }>
    inquiries: ClinicDashboardReportingCountMetric<"payload">
    profileCompleteness: Readonly<{
      comparison: null
      completedAreas: number | null
      percent: number | null
      source: "payload"
      state: ClinicDashboardReportingSourceState
      totalAreas: 6
    }>
    profileViews: ClinicDashboardReportingCountMetric<"posthog">
    reviews: Readonly<{
      average: Readonly<{
        comparison: null
        source: "payload"
        state: ClinicDashboardReportingSourceState | "no_reviews"
        value: number | null
      }>
      count: Readonly<{
        comparison: null
        source: "payload"
        state: ClinicDashboardReportingSourceState
        value: number | null
      }>
      source: "payload"
    }>
    sessionConversion: ClinicDashboardReportingSessionConversion
  }>
  period: Readonly<{
    days: ClinicDashboardReportingPeriodDays
    from: string
    to: string
  }>
  schemaVersion: typeof clinicDashboardReportingSchemaVersion
  timezone: "Europe/Istanbul"
}>

export type ClinicDashboardReportingLoadState =
  | Readonly<{
      reporting: ClinicDashboardReporting
      status: "ready"
    }>
  | Readonly<{
      status: "temporarily-unavailable"
    }>

export function isClinicDashboardReportingPeriodDays(
  value: number,
): value is ClinicDashboardReportingPeriodDays {
  return clinicDashboardReportingPeriodDays.some((periodDays) => periodDays === value)
}
