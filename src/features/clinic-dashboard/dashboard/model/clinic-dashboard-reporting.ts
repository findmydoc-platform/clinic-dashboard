export const clinicDashboardReportingPeriodDays = [7, 30, 90] as const

export const clinicDashboardReportingSchemaVersion = "clinic-dashboard-reporting-v3" as const

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

export type ClinicDashboardReporting = Readonly<{
  asOf: string
  comparisonPeriod: Readonly<{
    days: ClinicDashboardReportingPeriodDays
    from: string
    to: string
  }>
  metrics: Readonly<{
    inquiries: ClinicDashboardReportingCountMetric<"payload">
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
    uniqueVisitors: ClinicDashboardReportingCountMetric<"posthog">
    impressions: ClinicDashboardReportingCountMetric<"posthog">
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
      status: "temporarily-unavailable" | "access-denied" | "unauthorized"
    }>

export function isClinicDashboardReportingPeriodDays(
  value: number,
): value is ClinicDashboardReportingPeriodDays {
  return clinicDashboardReportingPeriodDays.some((periodDays) => periodDays === value)
}
