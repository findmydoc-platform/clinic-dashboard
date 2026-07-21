import { NextRequest, NextResponse } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createCsrfToken,
  isValidCsrfToken,
  setCsrfCookie,
  validateMutationRequest,
} from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

function createRequest(token?: string, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    body: JSON.stringify({}),
    headers: {
      "content-type": "application/json",
      ...(token ? { cookie: `clinic_dashboard_csrf=${token}`, [CLINIC_DASHBOARD_CSRF_HEADER]: token } : {}),
      origin,
    },
    method: "POST",
  })
}

describe("CSRF contract", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://staging-project.supabase.co")
  })

  afterEach(() => vi.unstubAllEnvs())

  it("accepts a fresh same-origin JSON mutation with matching cookie and header", () => {
    const token = createCsrfToken(createRequest())
    const request = createRequest(token)
    expect(isValidCsrfToken(request, token)).toBe(true)
    expect(validateMutationRequest(request)).toBe(true)
  })

  it("rejects cross-origin, missing, and expired tokens", () => {
    const issuedAt = Date.now() - 9 * 60 * 60 * 1_000
    const expiredToken = createCsrfToken(createRequest(), issuedAt)
    expect(validateMutationRequest(createRequest())).toBe(false)
    expect(validateMutationRequest(createRequest(expiredToken))).toBe(false)

    const token = createCsrfToken(createRequest())
    expect(validateMutationRequest(createRequest(token, "https://attacker.example"))).toBe(false)
  })

  it("writes a host-only, client-readable, same-site cookie", () => {
    const response = NextResponse.next()
    setCsrfCookie(response, "token")
    const cookie = response.cookies.get("clinic_dashboard_csrf")
    expect(cookie).toMatchObject({ httpOnly: false, path: "/", sameSite: "lax", value: "token" })
    expect(cookie?.domain).toBeUndefined()
  })
})
