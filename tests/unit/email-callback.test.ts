import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  decodeCompletionGrant,
  encodeCompletionGrant,
  validateEmailCallbackRequest,
} from "@/features/clinic-dashboard/auth/server/public"
import { GET } from "@/app/auth/callback/route"

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

  it.each([
    "https://clinic-dashboard-preview-findmydoc.vercel.app",
    "https://clinic-dashboard-5gepqbsiw-findmydoc.vercel.app",
    "https://dashboard.preview.findmydoc.eu",
  ])("continues a valid callback on trusted preview origin %s", (origin) => {
    vi.stubEnv("DASHBOARD_ORIGIN", "https://clinic-dashboard-preview-findmydoc.vercel.app")
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_URL", "clinic-dashboard-5gepqbsiw-findmydoc.vercel.app")
    const url = new URL("/auth/callback", origin)
    url.searchParams.set("token_hash", "secret-token-hash")
    url.searchParams.set("type", "recovery")
    url.searchParams.set("next", "/auth/password/reset/complete")

    const response = GET(new NextRequest(url))

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(`${origin}/auth/confirm?type=recovery`)
    expect(response.headers.get("set-cookie")).toContain("clinic_dashboard_pending_email=")
  })

  it("fails closed to the canonical login for an untrusted callback origin", () => {
    vi.stubEnv("DASHBOARD_ORIGIN", "https://clinic-dashboard-preview-findmydoc.vercel.app")
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_URL", "clinic-dashboard-5gepqbsiw-findmydoc.vercel.app")
    const url = new URL(
      "/auth/callback?token_hash=secret-token-hash&type=recovery&next=/auth/password/reset/complete",
      "https://clinic-dashboard-other-findmydoc.vercel.app",
    )

    const response = GET(new NextRequest(url))

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(
      "https://clinic-dashboard-preview-findmydoc.vercel.app/login?error=invalid-or-expired-link",
    )
    expect(response.headers.get("set-cookie")).toBeNull()
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
