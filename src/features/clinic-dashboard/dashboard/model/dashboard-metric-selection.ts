import {
  dashboardSelectableMetricIds,
  type DashboardMetric,
  type DashboardReportingSnapshot,
  type DashboardSelectableMetricId,
} from "./reporting"

type DashboardMetricDefinition = Readonly<{
  label: string
  totalKey: keyof DashboardReportingSnapshot["totals"]
  valueLabels: Readonly<{
    plural: string
    singular: string
  }>
}>

export const dashboardMetricDefinitions = {
  contacts: {
    label: "Contacts",
    totalKey: "contacts",
    valueLabels: { plural: "contacts", singular: "contact" },
  },
  impressions: {
    label: "Impressions",
    totalKey: "impressions",
    valueLabels: { plural: "impressions", singular: "impression" },
  },
  inquiries: {
    label: "Inquiries",
    totalKey: "inquiries",
    valueLabels: { plural: "inquiries", singular: "inquiry" },
  },
  views: {
    label: "Profile views",
    totalKey: "profileViews",
    valueLabels: { plural: "profile views", singular: "profile view" },
  },
} as const satisfies Record<DashboardSelectableMetricId, DashboardMetricDefinition>

export type DashboardMetricSelection = Readonly<{
  comparison: string
  description: string
  id: DashboardSelectableMetricId
  points: DashboardReportingSnapshot["chart"]["series"][DashboardSelectableMetricId]
  summary: readonly Readonly<{
    id: DashboardSelectableMetricId
    isSelected: boolean
    label: string
    value: string
  }>[]
  title: string
  valueLabels: DashboardMetricDefinition["valueLabels"]
}>

function formatCount(value: number) {
  return value.toLocaleString("en-US")
}

function getMetricDelta(metrics: readonly DashboardMetric[], metricId: DashboardSelectableMetricId) {
  const metric = metrics.find(({ id }) => id === metricId)

  if (!metric?.delta) throw new Error(`Dashboard metric ${metricId} requires a comparison delta.`)

  return metric.delta
}

export function createDashboardMetricSelection(
  reporting: DashboardReportingSnapshot,
  metricId: DashboardSelectableMetricId,
): DashboardMetricSelection {
  const definition = dashboardMetricDefinitions[metricId]
  const total = reporting.totals[definition.totalKey]
  const cadenceLabel = reporting.chart.cadence === "daily" ? "Daily" : "Weekly"

  return {
    comparison: `${getMetricDelta(reporting.metrics, metricId)} vs. previous ${reporting.period}`,
    description: `${cadenceLabel} ${definition.valueLabels.plural} across the selected ${reporting.period} total ${formatCount(total)}. Deterministic prototype data; not live analytics.`,
    id: metricId,
    points: reporting.chart.series[metricId],
    summary: dashboardSelectableMetricIds.map((id) => {
      const metricDefinition = dashboardMetricDefinitions[id]

      return {
        id,
        isSelected: id === metricId,
        label: metricDefinition.label,
        value: formatCount(reporting.totals[metricDefinition.totalKey]),
      }
    }),
    title: `${definition.label} over time`,
    valueLabels: definition.valueLabels,
  }
}
