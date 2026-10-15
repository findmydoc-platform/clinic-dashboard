import type {
  ClinicDashboardReportingCountMetric,
  ClinicDashboardReportingMetricValue,
  ClinicDashboardReportingSource,
  ClinicDashboardReportingSessionConversion,
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

function comparisonInformation(state: ClinicDashboardReportingSourceState | "zero_denominator") {
  if (state === "partial_coverage")
    return "Comparison not yet available. The preceding period does not have complete measurement coverage."
  if (state === "source_unavailable")
    return "Comparison unavailable. The data source could not supply the preceding period."
  if (state === "zero_denominator")
    return "Comparison unavailable. No profile-view sessions were recorded in the preceding period."
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

function formatReportingPercent(value: number | null) {
  return value === null
    ? "Not available"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value) + "%"
}

export function createSessionConversionDisplay(
  metric: ClinicDashboardReportingSessionConversion,
): CountMetricDisplay {
  const current = metric.current
  if (current.state === "zero_denominator") {
    return { detail: "No profile-view sessions were recorded.", value: "Not available" }
  }
  const display = createMetricValueDisplay({ state: current.state, value: current.ratePercent })
  return {
    ...display,
    comparison:
      current.state === "available" &&
      metric.comparison.state === "available" &&
      metric.comparison.percentagePointDelta !== null
        ? `${formatSignedNumber(metric.comparison.percentagePointDelta)} percentage points compared with the previous period`
        : undefined,
    information: current.state === "available" ? comparisonInformation(metric.comparison.state) : undefined,
    value: current.state === "available" ? formatReportingPercent(current.ratePercent) : display.value,
  }
}
