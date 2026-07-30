const PUBLIC_PATHS = new Set([
  "/api/auth/callback",
  "/api/auth/login",
  "/api/auth/password/reset",
  "/api/health",
  "/auth/callback",
  "/auth/confirm",
  "/auth/password/reset",
  "/login",
  "/robots.txt",
])

const SESSION_PATHS = new Set([
  "/access",
  "/api/auth/invite/complete",
  "/api/auth/logout",
  "/api/auth/password/reset/complete",
  "/auth/invite/complete",
  "/auth/password/reset/complete",
])

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname)
}

export function isSessionPath(pathname: string) {
  return SESSION_PATHS.has(pathname)
}

export function isAuthSurface(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/access" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth/")
  )
}
