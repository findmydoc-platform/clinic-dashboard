import {
  isClinicDashboardReportingPeriodDays,
  type ClinicDashboardReporting,
  type ClinicDashboardReportingPeriodDays,
} from "../model/clinic-dashboard-reporting"

const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
const numeric = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)
const countValue = (value: unknown) => numeric(value) && Number.isSafeInteger(value) && value >= 0
const stateValue = (value: unknown, isCount = true): boolean => {
  if (!record(value)) return false
  if (value.state === "available") return isCount ? countValue(value.value) : numeric(value.value)
  return (
    (value.state === "source_unavailable" ||
      value.state === "partial_coverage" ||
      (!isCount && value.state === "no_reviews")) &&
    value.value === null
  )
}

function isReportingResponse(value: unknown): value is ClinicDashboardReporting {
  if (!record(value) || !record(value.metrics) || !record(value.period) || !record(value.comparisonPeriod))
    return false
  if (
    value.schemaVersion !== "clinic-dashboard-reporting-v2" ||
    value.timezone !== "Europe/Istanbul" ||
    !isClinicDashboardReportingPeriodDays(Number(value.period.days)) ||
    value.period.days !== value.comparisonPeriod.days
  )
    return false
  const instant = (timestamp: unknown) =>
    typeof timestamp === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(timestamp) &&
    Number.isFinite(Date.parse(timestamp))
  if (
    ![
      value.asOf,
      value.period.from,
      value.period.to,
      value.comparisonPeriod.from,
      value.comparisonPeriod.to,
    ].every(instant) ||
    value.asOf !== value.period.to
  )
    return false
  const keys = ["impressions", "profileViews", "uniqueVisitors", "inquiryStarters", "inquiries"]
  if (Object.keys(value.metrics).length !== 6) return false
  for (const key of keys) {
    const metric = value.metrics[key]
    if (
      !record(metric) ||
      metric.source !== (key === "inquiries" ? "payload" : "posthog") ||
      !stateValue(metric.current) ||
      !stateValue(metric.comparison) ||
      !record(metric.comparison)
    )
      return false
    if (
      ![metric.comparison.absoluteDelta, metric.comparison.relativeDeltaPercent].every(
        (delta) => delta === null || numeric(delta),
      )
    )
      return false
  }
  const reviews = value.metrics.reviews
  return (
    record(reviews) &&
    reviews.source === "payload" &&
    stateValue(reviews.count) &&
    stateValue(reviews.average, false)
  )
}

export async function loadClinicDashboardReportingFromBrowser(
  clinicId: string,
  periodDays: ClinicDashboardReportingPeriodDays,
  fetcher: typeof fetch = fetch,
  onAccessFailure?: (failure: "access-denied" | "unauthorized") => void,
): Promise<ClinicDashboardReporting | undefined> {
  const endpoint = new URL(
    `/api/dashboard/clinics/${encodeURIComponent(clinicId)}/reporting`,
    window.location.origin,
  )
  endpoint.searchParams.set("periodDays", String(periodDays))

  try {
    const response = await fetcher(endpoint, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) {
      if (response.status === 401 || response.status === 403)
        onAccessFailure?.(response.status === 401 ? "unauthorized" : "access-denied")
      return undefined
    }

    const body: unknown = await response.json().catch(() => null)
    return isReportingResponse(body) ? body : undefined
  } catch {
    return undefined
  }
}
