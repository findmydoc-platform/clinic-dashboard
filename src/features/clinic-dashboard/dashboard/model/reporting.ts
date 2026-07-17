export const dashboardReportingPeriods = ["7 days", "30 days", "90 days"] as const

export type DashboardReportingPeriod = (typeof dashboardReportingPeriods)[number]

export type DashboardMetric = Readonly<{
  delta?: string
  id: "completion" | "contacts" | "impressions" | "inquiries" | "views"
  label: string
  note?: string
  progress?: number
  value: string
}>

export type DashboardFunnelStep = Readonly<{
  conversion?: string
  label: string
  value: string
}>

export type DashboardChartPoint = Readonly<{
  axisLabel?: string
  dateLabel: string
  value: number
}>

export type DashboardReportingSnapshot = Readonly<{
  chart: Readonly<{
    comparison: string
    description: string
    points: readonly DashboardChartPoint[]
    summary: readonly Readonly<{ label: string; value: string }>[]
  }>
  funnel: readonly DashboardFunnelStep[]
  metrics: readonly DashboardMetric[]
  period: DashboardReportingPeriod
  reviewActivity: string
  totals: Readonly<{
    contacts: number
    impressions: number
    inquiries: number
    profileViews: number
    uniqueVisitors: number
  }>
}>

export type DashboardReportingSnapshots = Readonly<
  Record<DashboardReportingPeriod, DashboardReportingSnapshot>
>

type DashboardReportingSnapshotInput = Readonly<{
  changes: Readonly<{
    contacts: string
    impressions: string
    inquiries: string
    profileViews: string
  }>
  chart: Readonly<{
    comparison: string
    description: string
    points: readonly DashboardChartPoint[]
  }>
  period: DashboardReportingPeriod
  reviewActivity: string
  totals: DashboardReportingSnapshot["totals"]
}>

function formatCount(value: number) {
  return value.toLocaleString("en-US")
}

function toPercentage(part: number, whole: number) {
  return `${((part / whole) * 100).toFixed(1)}%`
}

function getChartPointTotal(points: readonly DashboardChartPoint[]) {
  return points.reduce((total, point) => total + point.value, 0)
}

export function createDashboardReportingSnapshot({
  changes,
  chart,
  period,
  reviewActivity,
  totals,
}: DashboardReportingSnapshotInput): DashboardReportingSnapshot {
  const chartPointTotal = getChartPointTotal(chart.points)

  if (chartPointTotal !== totals.profileViews) {
    throw new Error(
      `Profile views chart for ${period} must total ${totals.profileViews}, received ${chartPointTotal}.`,
    )
  }

  return {
    chart: {
      ...chart,
      summary: [
        { label: "Impressions", value: formatCount(totals.impressions) },
        { label: "Views", value: formatCount(totals.profileViews) },
        { label: "Visitors", value: formatCount(totals.uniqueVisitors) },
        { label: "Inquiries", value: formatCount(totals.inquiries) },
      ],
    },
    funnel: [
      { label: "Impressions", value: formatCount(totals.impressions) },
      {
        conversion: `${toPercentage(totals.profileViews, totals.impressions)} of impressions`,
        label: "Profile views",
        value: formatCount(totals.profileViews),
      },
      {
        conversion: `${toPercentage(totals.uniqueVisitors, totals.profileViews)} of profile views`,
        label: "Unique visitors",
        value: formatCount(totals.uniqueVisitors),
      },
      {
        conversion: `${toPercentage(totals.contacts, totals.uniqueVisitors)} of unique visitors`,
        label: "Contacts",
        value: formatCount(totals.contacts),
      },
      {
        conversion: `${toPercentage(totals.inquiries, totals.contacts)} of contacts`,
        label: "Inquiries",
        value: formatCount(totals.inquiries),
      },
    ],
    metrics: [
      { id: "completion", label: "Profile completion", progress: 82, value: "82%" },
      {
        delta: changes.impressions,
        id: "impressions",
        label: "Impressions",
        note: "Shown in search",
        value: formatCount(totals.impressions),
      },
      {
        delta: changes.profileViews,
        id: "views",
        label: "Profile views",
        note: "Opened pages",
        value: formatCount(totals.profileViews),
      },
      {
        delta: changes.contacts,
        id: "contacts",
        label: "Contacts",
        note: "Chat conversations",
        value: formatCount(totals.contacts),
      },
      {
        delta: changes.inquiries,
        id: "inquiries",
        label: "Inquiries",
        note: "Bookings / reservations",
        value: formatCount(totals.inquiries),
      },
    ],
    period,
    reviewActivity,
    totals,
  }
}
