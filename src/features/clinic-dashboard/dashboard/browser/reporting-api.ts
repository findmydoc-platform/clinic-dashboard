import {
  isClinicDashboardReportingPeriodDays,
  type ClinicDashboardReporting,
  type ClinicDashboardReportingPeriodDays,
} from "../model/clinic-dashboard-reporting"

function isReportingResponse(value: unknown): value is ClinicDashboardReporting {
  if (!value || typeof value !== "object") return false

  const reporting = value as Partial<ClinicDashboardReporting>
  return (
    reporting.schemaVersion === "clinic-dashboard-reporting-v1" &&
    reporting.timezone === "Europe/Istanbul" &&
    Boolean(reporting.metrics) &&
    Boolean(reporting.period) &&
    isClinicDashboardReportingPeriodDays(reporting.period?.days ?? Number.NaN)
  )
}

export async function loadClinicDashboardReportingFromBrowser(
  periodDays: ClinicDashboardReportingPeriodDays,
  fetcher: typeof fetch = fetch,
): Promise<ClinicDashboardReporting | undefined> {
  const endpoint = new URL("/api/dashboard/reporting", window.location.origin)
  endpoint.searchParams.set("periodDays", String(periodDays))

  try {
    const response = await fetcher(endpoint, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) return undefined

    const body: unknown = await response.json().catch(() => null)
    return isReportingResponse(body) ? body : undefined
  } catch {
    return undefined
  }
}
