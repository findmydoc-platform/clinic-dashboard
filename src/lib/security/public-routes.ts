const PUBLIC_PATHS = new Set(["/api/auth/login", "/api/health", "/login", "/robots.txt"])

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname)
}
