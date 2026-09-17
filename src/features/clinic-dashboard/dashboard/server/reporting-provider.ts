import "server-only"

import type {
  ClinicDashboardReporting,
  ClinicDashboardReportingPeriodDays,
} from "../model/clinic-dashboard-reporting"

export type ClinicDashboardReportingProviderError =
  "access-denied" | "invalid-data" | "temporarily-unavailable" | "unauthorized"

export type ClinicDashboardReportingProviderResult =
  | Readonly<{
      ok: true
      value: ClinicDashboardReporting
    }>
  | Readonly<{
      error: ClinicDashboardReportingProviderError
      ok: false
    }>

export type ClinicDashboardReportingProvider = Readonly<{
  loadReporting: (
    periodDays: ClinicDashboardReportingPeriodDays,
  ) => Promise<ClinicDashboardReportingProviderResult>
}>

export type ClinicDashboardReportingProviderFactory = (
  accessToken: string,
) => ClinicDashboardReportingProvider
