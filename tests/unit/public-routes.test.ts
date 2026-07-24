import { describe, expect, it } from "vitest"
import { isPublicPath, isSessionPath } from "@/lib/security/public-routes"

describe("route access registry", () => {
  it.each([
    "/login",
    "/api/auth/login",
    "/auth/password/reset",
    "/api/auth/password/reset",
    "/auth/callback",
    "/auth/confirm",
    "/api/auth/callback",
    "/api/health",
    "/robots.txt",
  ])("registers %s as public", (pathname) => {
    expect(isPublicPath(pathname)).toBe(true)
  })

  it.each([
    "/auth/invite/complete",
    "/api/auth/invite/complete",
    "/auth/password/reset/complete",
    "/api/auth/password/reset/complete",
    "/access",
    "/api/auth/logout",
  ])("registers %s as session protected", (pathname) => {
    expect(isSessionPath(pathname)).toBe(true)
    expect(isPublicPath(pathname)).toBe(false)
  })

  it.each(["/", "/api/dashboard/bootstrap", "/admin", "/api/auth/signin"])(
    "does not accidentally expose %s",
    (pathname) => {
      expect(isPublicPath(pathname)).toBe(false)
    },
  )
})
