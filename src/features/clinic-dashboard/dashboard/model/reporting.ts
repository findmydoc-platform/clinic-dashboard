export const dashboardReportingPeriods = ["7 days", "30 days", "90 days"] as const

export const dashboardSelectableMetricIds = [
  "impressions",
  "views",
  "uniqueVisitors",
  "contacts",
  "inquiries",
] as const

export type DashboardReportingPeriod = (typeof dashboardReportingPeriods)[number]

export type DashboardSelectableMetricId = (typeof dashboardSelectableMetricIds)[number]

export type DashboardMetric = Readonly<{
  delta?: string
  id: "completion" | DashboardSelectableMetricId
  label: string
  note?: string
  progress?: number
  value: string
}>

export type DashboardFunnelStep = Readonly<{
  conversion?: string
  label: string
  metricId: DashboardSelectableMetricId
  value: string
}>

export type DashboardChartPoint = Readonly<{
  axisLabel?: string
  dateLabel: string
  value: number
}>

export type DashboardReportingSnapshot = Readonly<{
  chart: Readonly<{
    cadence: "daily" | "weekly"
    series: Readonly<Record<DashboardSelectableMetricId, readonly DashboardChartPoint[]>>
  }>
  funnel: readonly DashboardFunnelStep[]
  metrics: readonly Readonly<DashboardMetric & { id: DashboardSelectableMetricId }>[]
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

export function isDashboardSelectableMetricId(
  metricId: DashboardMetric["id"],
): metricId is DashboardSelectableMetricId {
  return dashboardSelectableMetricIds.some((selectableMetricId) => selectableMetricId === metricId)
}

type DashboardReportingSnapshotInput = Readonly<{
  changes: Readonly<Record<Exclude<DashboardSelectableMetricId, "uniqueVisitors">, string>>
  chart: Readonly<{
    cadence: "daily" | "weekly"
    dates: readonly Omit<DashboardChartPoint, "value">[]
    series: Readonly<Record<DashboardSelectableMetricId, readonly number[]>>
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

const dashboardMetricTotalKeys = {
  contacts: "contacts",
  impressions: "impressions",
  inquiries: "inquiries",
  uniqueVisitors: "uniqueVisitors",
  views: "profileViews",
} as const satisfies Record<DashboardSelectableMetricId, keyof DashboardReportingSnapshot["totals"]>

function createDashboardChartSeries(
  dates: DashboardReportingSnapshotInput["chart"]["dates"],
  values: readonly number[],
  metricId: DashboardSelectableMetricId,
  period: DashboardReportingPeriod,
) {
  if (dates.length !== values.length) {
    throw new Error(
      `${metricId} chart for ${period} must provide ${dates.length} values, received ${values.length}.`,
    )
  }

  return dates.map((date, index) => ({ ...date, value: values[index] ?? 0 }))
}

export function createDashboardReportingSnapshot({
  changes,
  chart,
  period,
  reviewActivity,
  totals,
}: DashboardReportingSnapshotInput): DashboardReportingSnapshot {
  const series = {
    contacts: createDashboardChartSeries(chart.dates, chart.series.contacts, "contacts", period),
    impressions: createDashboardChartSeries(chart.dates, chart.series.impressions, "impressions", period),
    inquiries: createDashboardChartSeries(chart.dates, chart.series.inquiries, "inquiries", period),
    uniqueVisitors: createDashboardChartSeries(
      chart.dates,
      chart.series.uniqueVisitors,
      "uniqueVisitors",
      period,
    ),
    views: createDashboardChartSeries(chart.dates, chart.series.views, "views", period),
  } satisfies Record<DashboardSelectableMetricId, readonly DashboardChartPoint[]>

  for (const metricId of dashboardSelectableMetricIds) {
    const expectedTotal = totals[dashboardMetricTotalKeys[metricId]]
    const receivedTotal = getChartPointTotal(series[metricId])

    if (receivedTotal !== expectedTotal) {
      throw new Error(
        `${metricId} chart for ${period} must total ${expectedTotal}, received ${receivedTotal}.`,
      )
    }
  }

  return {
    chart: {
      cadence: chart.cadence,
      series,
    },
    funnel: [
      { label: "Impressions", metricId: "impressions", value: formatCount(totals.impressions) },
      {
        conversion: `${toPercentage(totals.profileViews, totals.impressions)} of impressions`,
        label: "Profile views",
        metricId: "views",
        value: formatCount(totals.profileViews),
      },
      {
        conversion: `${toPercentage(totals.uniqueVisitors, totals.profileViews)} of profile views`,
        label: "Unique visitors",
        metricId: "uniqueVisitors",
        value: formatCount(totals.uniqueVisitors),
      },
      {
        conversion: `${toPercentage(totals.contacts, totals.uniqueVisitors)} of unique visitors`,
        label: "Contacts",
        metricId: "contacts",
        value: formatCount(totals.contacts),
      },
      {
        conversion: `${toPercentage(totals.inquiries, totals.contacts)} of contacts`,
        label: "Inquiries",
        metricId: "inquiries",
        value: formatCount(totals.inquiries),
      },
    ],
    metrics: [
      {
        delta: changes.impressions,
        id: "impressions",
        label: "Impressions",
        note: "Shown in search",
        value: formatCount(totals.impressions),
      },
      {
        delta: changes.views,
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
        note: "Patient inquiries",
        value: formatCount(totals.inquiries),
      },
    ],
    period,
    reviewActivity,
    totals,
  }
}
