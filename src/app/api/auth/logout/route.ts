import { NextResponse } from "next/server"
import {
  DASHBOARD_AUTH_COOKIE,
  getDashboardRedirectUrl,
  getDashboardSessionCookieOptions,
} from "@/lib/security/dashboard-auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const response = NextResponse.redirect(getDashboardRedirectUrl(request, "/login"), { status: 303 })
  response.cookies.set({
    ...getDashboardSessionCookieOptions(),
    maxAge: 0,
    name: DASHBOARD_AUTH_COOKIE,
    value: "",
  })
  response.headers.set("Cache-Control", "no-store")

  return response
}
