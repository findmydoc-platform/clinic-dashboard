import "server-only"

import type { NextRequest } from "next/server"
import type {
  ClinicDashboardReportingLoadState,
  ClinicDashboardReportingPeriodDays,
} from "../model/clinic-dashboard-reporting"
import { handleClinicDashboardReportingLoad as handleClinicDashboardReportingLoadWithProvider } from "./reporting-actions"
import type { ClinicDashboardReportingProviderFactory } from "./reporting-provider"

export function handleClinicDashboardReportingLoad(
  request: NextRequest,
  createReportingProvider: ClinicDashboardReportingProviderFactory,
) {
  return handleClinicDashboardReportingLoadWithProvider(request, createReportingProvider)
}

export async function loadClinicDashboardReporting(
  accessToken: string,
  clinicId: string,
  createReportingProvider: ClinicDashboardReportingProviderFactory,
  periodDays: ClinicDashboardReportingPeriodDays = 30,
): Promise<ClinicDashboardReportingLoadState> {
  try {
    const result = await createReportingProvider(accessToken, clinicId).loadReporting(periodDays)
    return result.ok ? { reporting: result.value, status: "ready" } : { status: "temporarily-unavailable" }
  } catch {
    return { status: "temporarily-unavailable" }
  }
}
