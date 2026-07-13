import { describe, expect, it } from "vitest"
import { isPublicPath } from "@/lib/security/public-routes"

describe("public route registry", () => {
  it("allows only registered routes and prefixes", () => {
    expect(isPublicPath("/")).toBe(true)
    expect(isPublicPath("/api/health")).toBe(true)
    expect(isPublicPath("/login")).toBe(false)
    expect(isPublicPath("/api/auth/signin")).toBe(false)
    expect(isPublicPath("/admin")).toBe(false)
  })
})
