import { createHash, timingSafeEqual } from "node:crypto"

export const DASHBOARD_AUTH_COOKIE = "clinic_dashboard_session"
export const DASHBOARD_SESSION_MAX_AGE = 60 * 60 * 24 * 7

const INITIAL_DASHBOARD_PASSWORD = "findmydoc"

function digest(value: string) {
  return createHash("sha256").update(value).digest()
}

function secureEqual(expected: string, actual: string) {
  return timingSafeEqual(digest(expected), digest(actual))
}

export function getDashboardPassword() {
  return process.env.DASHBOARD_PASSWORD || INITIAL_DASHBOARD_PASSWORD
}

export function isValidDashboardPassword(candidate: string) {
  return secureEqual(getDashboardPassword(), candidate)
}

export function createDashboardSessionToken() {
  return digest(`clinic-dashboard:${getDashboardPassword()}`).toString("hex")
}

export function isValidDashboardSessionToken(token: string | undefined) {
  return typeof token === "string" && secureEqual(createDashboardSessionToken(), token)
}

export function getDashboardSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: DASHBOARD_SESSION_MAX_AGE,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  }
}

export function getDashboardRedirectUrl(request: Request, pathname: string) {
  const url = new URL(pathname, request.url)
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim()
  const requestHost = forwardedHost || request.headers.get("host")

  if (requestHost) {
    url.host = requestHost
  }

  return url
}
