import type {
  ClinicDashboardReportingCountMetric,
  ClinicDashboardReportingMetricValue,
  ClinicDashboardReportingSource,
} from "./clinic-dashboard-reporting"

type MetricValueDisplay = Readonly<{
  detail?: "Data source unavailable" | "Incomplete data coverage"
  value: string
}>

type CountMetricDisplay = MetricValueDisplay &
  Readonly<{
    comparison?: string
  }>

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)
}

function formatSignedNumber(value: number) {
  const formatted = formatNumber(Math.abs(value))
  return value > 0 ? `+${formatted}` : value < 0 ? `−${formatted}` : formatted
}

function formatSignedPercent(value: number) {
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(Math.abs(value))
  return value > 0 ? `+${formatted}%` : value < 0 ? `−${formatted}%` : "0%"
}

export function createMetricValueDisplay(value: ClinicDashboardReportingMetricValue): MetricValueDisplay {
  if (value.state === "source_unavailable") {
    return { detail: "Data source unavailable", value: "Not available" }
  }
  if (value.state === "partial_coverage") {
    return { detail: "Incomplete data coverage", value: "Not available" }
  }
  return value.value === null ? { value: "Not available" } : { value: formatNumber(value.value) }
}

export function createCountMetricDisplay<Source extends ClinicDashboardReportingSource>(
  metric: Pick<ClinicDashboardReportingCountMetric<Source>, "comparison" | "current">,
): CountMetricDisplay {
  const display = createMetricValueDisplay(metric.current)
  const { comparison } = metric
  if (
    comparison.state !== "available" ||
    comparison.value === null ||
    metric.current.state !== "available" ||
    metric.current.value === null ||
    comparison.absoluteDelta === null
  ) {
    return display
  }

  if (comparison.absoluteDelta === 0) {
    return { ...display, comparison: "No change compared with the previous period" }
  }
  if (comparison.relativeDeltaPercent !== null) {
    return {
      ...display,
      comparison: `${formatSignedPercent(comparison.relativeDeltaPercent)} compared with the previous period`,
    }
  }
  return {
    ...display,
    comparison: `${formatSignedNumber(comparison.absoluteDelta)} compared with the previous period`,
  }
}

export function formatReportingPercent(value: number | null) {
  return value === null
    ? "Not available"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value) + "%"
}
