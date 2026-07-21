import { describe, expect, it } from "vitest"
import { getExpectedDashboardOrigin, isSecureCookieEnvironment, validateEnvironment } from "@/lib/env"

const baseEnvironment = {
  CSRF_SIGNING_SECRET: "0123456789abcdef0123456789abcdef",
  DASHBOARD_ORIGIN: "http://localhost:3000",
  PAYLOAD_API_URL: "https://preview.findmydoc.eu",
  SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  SUPABASE_URL: "https://staging-project.supabase.co",
} as const

describe("environment contract", () => {
  it("requires every server-only authentication and bootstrap variable", () => {
    expect(() => validateEnvironment({})).toThrow()
    expect(validateEnvironment(baseEnvironment)).toMatchObject(baseEnvironment)
  })

  it("allows controlled auth only outside deployed environments", () => {
    expect(
      validateEnvironment({
        ...baseEnvironment,
        CLINIC_DASHBOARD_AUTH_TEST_MODE: "controlled",
        CLINIC_DASHBOARD_TEST_PASSWORD: "test-password",
        NODE_ENV: "test",
      }),
    ).toBeDefined()
    expect(() =>
      validateEnvironment({
        ...baseEnvironment,
        CLINIC_DASHBOARD_AUTH_TEST_MODE: "controlled",
        CLINIC_DASHBOARD_TEST_PASSWORD: "test-password",
        NODE_ENV: "production",
      }),
    ).toThrow(/Controlled authentication/)
  })

  it("enforces the canonical preview and production Payload origins", () => {
    const preview = validateEnvironment({
      ...baseEnvironment,
      DASHBOARD_ORIGIN: "https://clinic-dashboard-git-feature-findmydoc.vercel.app",
      VERCEL_ENV: "preview",
      VERCEL_URL: "clinic-dashboard-git-feature-findmydoc.vercel.app",
    })
    expect(getExpectedDashboardOrigin(preview)).toBe(
      "https://clinic-dashboard-git-feature-findmydoc.vercel.app",
    )
    expect(isSecureCookieEnvironment(preview)).toBe(true)

    expect(
      validateEnvironment({
        ...baseEnvironment,
        DASHBOARD_ORIGIN: "https://clinics.findmydoc.eu",
        PAYLOAD_API_URL: "https://findmydoc.eu",
        SUPABASE_URL: "https://production-project.supabase.co",
        VERCEL_ENV: "production",
      }),
    ).toBeDefined()
    expect(() =>
      validateEnvironment({
        ...baseEnvironment,
        DASHBOARD_ORIGIN: "https://other.example.com",
        PAYLOAD_API_URL: "https://findmydoc.eu",
        VERCEL_ENV: "production",
      }),
    ).toThrow(/canonical Clinic Dashboard origin/)
  })

  it("rejects short CSRF secrets and insecure deployed endpoints", () => {
    expect(() => validateEnvironment({ ...baseEnvironment, CSRF_SIGNING_SECRET: "short" })).toThrow()
    expect(() =>
      validateEnvironment({
        ...baseEnvironment,
        DASHBOARD_ORIGIN: "http://preview.example.com",
        VERCEL_ENV: "preview",
      }),
    ).toThrow(/HTTPS/)
  })
})
