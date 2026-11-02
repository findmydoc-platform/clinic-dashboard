import type {
  ClinicDashboardReportingCountMetric,
  ClinicDashboardReportingMetricValue,
  ClinicDashboardReportingSource,
  ClinicDashboardReportingSourceState,
} from "./clinic-dashboard-reporting"

type MetricValueDisplay = Readonly<{
  detail?: string
  information?: string
  value: string
}>

type CountMetricDisplay = MetricValueDisplay &
  Readonly<{
    comparison?: string
  }>

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)
}

function comparisonInformation(state: ClinicDashboardReportingSourceState) {
  if (state === "partial_coverage")
    return "Comparison not yet available. The preceding period does not have complete measurement coverage."
  if (state === "source_unavailable")
    return "Comparison unavailable. The data source could not supply the preceding period."
  return undefined
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
    return metric.current.state === "available"
      ? { ...display, information: comparisonInformation(comparison.state) }
      : display
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

export function formatReportingObservationTimestamp(timestamp: string, timezone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      calendar: "gregory",
      numberingSystem: "latn",
      timeZone: timezone,
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(timestamp))
      .map(({ type, value }) => [type, value]),
  )
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${Number(parts.day)} ${months[Number(parts.month) - 1]} ${parts.year}, ${parts.hour.padStart(2, "0")}:${parts.minute.padStart(2, "0")}`
}
