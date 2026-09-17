import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import { resolveClinicDashboardRouteAccess } from "@/features/clinic-dashboard/auth/server/public"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"
import {
  isClinicDashboardReportingPeriodDays,
  type ClinicDashboardReportingPeriodDays,
} from "../model/clinic-dashboard-reporting"
import type {
  ClinicDashboardReportingProviderError,
  ClinicDashboardReportingProviderFactory,
} from "./reporting-provider"

function privateJson(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status })
  applyPrivateResponseHeaders(response.headers)
  response.headers.set("Vary", "Cookie")
  return response
}

function requestedPeriodDays(request: NextRequest): ClinicDashboardReportingPeriodDays | undefined {
  const queryKeys = [...request.nextUrl.searchParams.keys()]
  if (queryKeys.some((key) => key !== "periodDays")) return undefined

  const values = request.nextUrl.searchParams.getAll("periodDays")
  if (values.length !== 1 || !/^\d+$/u.test(values[0] ?? "")) return undefined

  const periodDays = Number(values[0])
  return isClinicDashboardReportingPeriodDays(periodDays) ? periodDays : undefined
}

function accessErrorResponse(
  status: Exclude<Awaited<ReturnType<typeof resolveClinicDashboardRouteAccess>>["status"], "approved">,
) {
  if (status === "denied") return privateJson({ code: "REPORTING_ACCESS_DENIED" }, 403)
  if (status === "temporarily-unavailable") {
    return privateJson({ code: "REPORTING_SERVICE_UNAVAILABLE" }, 503)
  }
  return privateJson({ code: "REPORTING_UNAUTHORIZED" }, 401)
}

function providerErrorResponse(error: ClinicDashboardReportingProviderError) {
  if (error === "unauthorized") return privateJson({ code: "REPORTING_UNAUTHORIZED" }, 401)
  if (error === "access-denied") return privateJson({ code: "REPORTING_ACCESS_DENIED" }, 403)
  return privateJson({ code: "REPORTING_SERVICE_UNAVAILABLE" }, 503)
}

export async function handleClinicDashboardReportingLoad(
  request: NextRequest,
  createReportingProvider: ClinicDashboardReportingProviderFactory,
) {
  const periodDays = requestedPeriodDays(request)
  if (!periodDays) return privateJson({ code: "REPORTING_INVALID_INPUT" }, 400)

  const authorization = await resolveClinicDashboardRouteAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }

  try {
    const result = await createReportingProvider(
      authorization.accessToken,
      authorization.clinicId,
    ).loadReporting(periodDays)
    const response = result.ok ? privateJson(result.value) : providerErrorResponse(result.error)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "REPORTING_SERVICE_UNAVAILABLE" }, 503))
  }
}
