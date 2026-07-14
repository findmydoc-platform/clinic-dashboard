import { NextResponse } from "next/server"
import {
  createDashboardSessionToken,
  DASHBOARD_AUTH_COOKIE,
  getDashboardRedirectUrl,
  getDashboardSessionCookieOptions,
  isValidDashboardPassword,
} from "@/lib/security/dashboard-auth"

export const runtime = "nodejs"

function redirectToLogin(request: Request, error?: string) {
  const url = getDashboardRedirectUrl(request, "/login")
  if (error) {
    url.searchParams.set("error", error)
  }

  const response = NextResponse.redirect(url, { status: 303 })
  response.headers.set("Cache-Control", "no-store")
  return response
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const passwordValue = formData.get("password")
  const password = typeof passwordValue === "string" ? passwordValue : ""

  if (!isValidDashboardPassword(password)) {
    return redirectToLogin(request, "invalid_password")
  }

  const response = NextResponse.redirect(getDashboardRedirectUrl(request, "/"), { status: 303 })
  response.cookies.set({
    ...getDashboardSessionCookieOptions(),
    name: DASHBOARD_AUTH_COOKIE,
    value: createDashboardSessionToken(),
  })
  response.headers.set("Cache-Control", "no-store")
  return response
}
