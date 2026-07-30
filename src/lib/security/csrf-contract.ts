export const CLINIC_DASHBOARD_CSRF_COOKIE = "clinic_dashboard_csrf"
export const CLINIC_DASHBOARD_CSRF_HEADER = "x-csrf-token"

export function readBrowserCsrfToken(cookieValue: string = document.cookie) {
  const encodedToken = cookieValue
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CLINIC_DASHBOARD_CSRF_COOKIE}=`))
    ?.slice(CLINIC_DASHBOARD_CSRF_COOKIE.length + 1)

  return encodedToken ? decodeURIComponent(encodedToken) : undefined
}
