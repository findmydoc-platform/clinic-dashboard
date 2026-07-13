const PUBLIC_PATHS = new Set(["/", "/api/health"])

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname)
}
