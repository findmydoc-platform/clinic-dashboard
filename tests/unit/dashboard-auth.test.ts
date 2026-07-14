import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createDashboardSessionToken,
  isValidDashboardPassword,
  isValidDashboardSessionToken,
} from "@/lib/security/dashboard-auth"

describe("temporary dashboard guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("uses the initial password when no override is configured", () => {
    vi.stubEnv("DASHBOARD_PASSWORD", "")

    expect(isValidDashboardPassword("findmydoc")).toBe(true)
    expect(isValidDashboardPassword("wrong-password")).toBe(false)
  })

  it("validates a session token derived from the configured password", () => {
    vi.stubEnv("DASHBOARD_PASSWORD", "test-password")
    const token = createDashboardSessionToken()

    expect(isValidDashboardSessionToken(token)).toBe(true)
    expect(isValidDashboardSessionToken("invalid-token")).toBe(false)
  })
})
