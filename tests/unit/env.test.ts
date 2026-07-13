import { describe, expect, it } from "vitest"
import { validateEnvironment } from "@/lib/env"

describe("environment contract", () => {
  it("accepts the data-less production foundation without auth secrets", () => {
    expect(validateEnvironment({ NODE_ENV: "production", VERCEL_ENV: "production" })).toMatchObject({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
    })
  })

  it("rejects unsupported deployment labels", () => {
    expect(() => validateEnvironment({ NEXT_PUBLIC_DEPLOYMENT_ENV: "staging" })).toThrow()
  })
})
