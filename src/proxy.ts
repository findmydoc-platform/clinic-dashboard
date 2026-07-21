import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import {
  createProxySupabaseClient,
  hasControlledSession,
} from "@/features/clinic-dashboard/auth/server/public"
import { validateEnvironment } from "@/lib/env"
import { createCsrfToken, isValidCsrfToken, setCsrfCookie } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_COOKIE } from "@/lib/security/csrf-contract"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"
import { isAuthSurface, isPublicPath } from "@/lib/security/public-routes"

function copyResponseState(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie)
  source.headers.forEach((value, name) => {
    if (name !== "location" && name !== "x-middleware-next" && name !== "x-middleware-rewrite") {
      target.headers.set(name, value)
    }
  })
  return target
}

function issueCsrfCookieIfNeeded(request: NextRequest, response: NextResponse) {
  if (request.method !== "GET" && request.method !== "HEAD") return
  const existingToken = request.cookies.get(CLINIC_DASHBOARD_CSRF_COOKIE)?.value
  if (!isValidCsrfToken(request, existingToken)) {
    setCsrfCookie(response, createCsrfToken(request))
  }
}

export async function proxy(request: NextRequest) {
  validateEnvironment()

  const controlledSession = hasControlledSession(request.cookies)
  let hasSession = controlledSession
  let response: NextResponse

  if (controlledSession) {
    response = NextResponse.next({ request })
  } else {
    const proxyClient = createProxySupabaseClient(request)
    try {
      const { data, error } = await proxyClient.client.auth.getClaims()
      hasSession = !error && Boolean(data?.claims?.sub)
    } catch {
      hasSession = false
    }
    response = proxyClient.getResponse()
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  if (hasSession || isAuthSurface(request.nextUrl.pathname)) {
    issueCsrfCookieIfNeeded(request, response)
  }
  if (hasSession || isAuthSurface(request.nextUrl.pathname) || !isPublicPath(request.nextUrl.pathname)) {
    applyPrivateResponseHeaders(response.headers)
  }

  if (isPublicPath(request.nextUrl.pathname) || request.nextUrl.pathname.startsWith("/api/")) {
    return response
  }

  if (hasSession) return response

  const loginUrl = new URL("/login", request.nextUrl.origin)
  const redirect = copyResponseState(response, NextResponse.redirect(loginUrl))
  applyPrivateResponseHeaders(redirect.headers)
  return redirect
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|favicon.ico|fonts/|icon.svg|robots.txt|sitemap.xml).*)"],
}
