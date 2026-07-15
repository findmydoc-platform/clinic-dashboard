import { describe, expect, it } from "vitest"
import { validateEnvironment } from "@/lib/env"

describe("environment contract", () => {
  it("accepts the initial password only for local development and tests", () => {
    expect(validateEnvironment({ NODE_ENV: "development" })).toMatchObject({
      NODE_ENV: "development",
    })
    expect(validateEnvironment({ NODE_ENV: "test" })).toMatchObject({ NODE_ENV: "test" })
  })

  it("requires a configured password for preview and production", () => {
    expect(() => validateEnvironment({ NODE_ENV: "production", VERCEL_ENV: "production" })).toThrow(
      /DASHBOARD_PASSWORD/,
    )
    expect(() =>
      validateEnvironment({ NODE_ENV: "development", NEXT_PUBLIC_DEPLOYMENT_ENV: "preview" }),
    ).toThrow(/DASHBOARD_PASSWORD/)
    expect(
      validateEnvironment({
        DASHBOARD_PASSWORD: "configured-preview-password",
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
      }),
    ).toMatchObject({ VERCEL_ENV: "preview" })
  })

  it("rejects unsupported deployment labels", () => {
    expect(() => validateEnvironment({ NEXT_PUBLIC_DEPLOYMENT_ENV: "staging" })).toThrow()
  })
})
