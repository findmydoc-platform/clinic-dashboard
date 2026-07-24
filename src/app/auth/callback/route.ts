import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import {
  setPendingEmailCallbackCookie,
  validateEmailCallbackRequest,
} from "@/features/clinic-dashboard/auth/server/public"
import { getExpectedDashboardOrigin, validateEnvironment } from "@/lib/env"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"

export const runtime = "nodejs"

export function GET(request: NextRequest) {
  const callback = validateEmailCallbackRequest(request)
  const target = new URL(
    callback ? "/auth/confirm" : "/login",
    getExpectedDashboardOrigin(validateEnvironment()),
  )

  if (callback) {
    target.searchParams.set("type", callback.type)
  } else {
    target.searchParams.set("error", "invalid-or-expired-link")
  }

  const response = NextResponse.redirect(target, { status: 303 })
  if (callback) setPendingEmailCallbackCookie(response, callback)
  applyPrivateResponseHeaders(response.headers)
  response.headers.set("Referrer-Policy", "no-referrer")
  return response
}
