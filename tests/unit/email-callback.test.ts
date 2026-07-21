import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { validateEmailCallbackRequest } from "@/features/clinic-dashboard/auth/server/public"

describe("email callback validation", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://staging-project.supabase.co")
  })

  afterEach(() => vi.unstubAllEnvs())

  it.each([
    ["invite", "/auth/invite/complete"],
    ["recovery", "/auth/password/reset/complete"],
  ] as const)("accepts only the %s token hash destination", (type, next) => {
    const url = new URL("/auth/callback", "http://localhost:3000")
    url.searchParams.set("token_hash", "secret-token-hash")
    url.searchParams.set("type", type)
    url.searchParams.set("next", next)
    expect(validateEmailCallbackRequest(new NextRequest(url))).toEqual({
      next,
      tokenHash: "secret-token-hash",
      type,
    })
  })

  it("rejects mismatched flow destinations", () => {
    expect(
      validateEmailCallbackRequest(
        new NextRequest(
          "http://localhost:3000/auth/callback?token_hash=secret&type=invite&next=/auth/password/reset/complete",
        ),
      ),
    ).toBeUndefined()
  })
})
