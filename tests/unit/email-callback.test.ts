import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  decodeCompletionGrant,
  encodeCompletionGrant,
  validateEmailCallbackRequest,
} from "@/features/clinic-dashboard/auth/server/public"

describe("email callback validation", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
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

  it("accepts only fresh, signed completion grants", () => {
    const now = Date.now()
    const grant = encodeCompletionGrant({
      flow: "invite",
      issuedAt: Math.floor(now / 1000),
      subject: "clinic-staff-1",
    })
    const tampered = `${grant.slice(0, -1)}${grant.endsWith("a") ? "b" : "a"}`

    expect(decodeCompletionGrant(grant, now)).toMatchObject({
      flow: "invite",
      subject: "clinic-staff-1",
    })
    expect(decodeCompletionGrant(tampered, now)).toBeUndefined()
    expect(decodeCompletionGrant(grant, now + 11 * 60 * 1_000)).toBeUndefined()
    expect(decodeCompletionGrant(grant, now - 60_000)).toBeUndefined()
  })
})
