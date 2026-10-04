import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import {
  setPendingEmailCallbackCookie,
  validateEmailCallbackRequest,
  validateWebsiteAction,
} from "@/features/clinic-dashboard/auth/server/public"
import { getExpectedDashboardOrigin, getTrustedRequestDashboardOrigin, validateEnvironment } from "@/lib/env"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const environment = validateEnvironment()
  const requestOrigin = getTrustedRequestDashboardOrigin(request, environment)
  const candidate = requestOrigin ? validateEmailCallbackRequest(request) : undefined
  const outcome = candidate ? await validateWebsiteAction(candidate.actionRef, candidate.type) : "invalid"
  const callback = outcome === "valid" ? candidate : undefined
  const target = new URL(
    callback ? "/auth/confirm" : "/login",
    requestOrigin ?? getExpectedDashboardOrigin(environment),
  )

  if (callback) {
    target.searchParams.set("type", callback.type)
  } else {
    target.searchParams.set(
      "error",
      outcome === "unavailable" ? "temporarily-unavailable" : "invalid-or-expired-link",
    )
  }

  const response = NextResponse.redirect(target, { status: 303 })
  if (callback) setPendingEmailCallbackCookie(response, callback)
  applyPrivateResponseHeaders(response.headers)
  response.headers.set("Referrer-Policy", "no-referrer")
  return response
}
