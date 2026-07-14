import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import {
  DASHBOARD_AUTH_COOKIE,
  getDashboardRedirectUrl,
  isValidDashboardSessionToken,
} from "@/lib/security/dashboard-auth"
import { validateEnvironment } from "@/lib/env"
import { isPublicPath } from "@/lib/security/public-routes"

function withDeploymentHeaders(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")

  return response
}

export function proxy(request: NextRequest) {
  validateEnvironment()

  if (isPublicPath(request.nextUrl.pathname)) {
    return withDeploymentHeaders(NextResponse.next())
  }

  const sessionToken = request.cookies.get(DASHBOARD_AUTH_COOKIE)?.value
  if (isValidDashboardSessionToken(sessionToken)) {
    return withDeploymentHeaders(NextResponse.next())
  }

  return withDeploymentHeaders(NextResponse.redirect(getDashboardRedirectUrl(request, "/login")))
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|favicon.ico|fonts/|icon.svg|robots.txt|sitemap.xml).*)"],
}
