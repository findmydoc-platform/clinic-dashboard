import "server-only"

import type { NextRequest } from "next/server"
import type {
  ClinicDashboardReportingLoadState,
  ClinicDashboardReportingPeriodDays,
} from "../model/clinic-dashboard-reporting"
import { createPayloadClinicDashboardReportingProvider } from "./payload-reporting"
import { handleClinicDashboardReportingLoad as handleClinicDashboardReportingLoadWithProvider } from "./reporting-actions"

export function handleClinicDashboardReportingLoad(request: NextRequest) {
  return handleClinicDashboardReportingLoadWithProvider(
    request,
    createPayloadClinicDashboardReportingProvider,
  )
}

export async function loadClinicDashboardReporting(
  accessToken: string,
  periodDays: ClinicDashboardReportingPeriodDays = 30,
): Promise<ClinicDashboardReportingLoadState> {
  try {
    const result = await createPayloadClinicDashboardReportingProvider(accessToken).loadReporting(periodDays)
    return result.ok ? { reporting: result.value, status: "ready" } : { status: "temporarily-unavailable" }
  } catch {
    return { status: "temporarily-unavailable" }
  }
}
