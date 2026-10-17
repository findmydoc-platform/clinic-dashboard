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
