import { NextRequest, NextResponse } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createCsrfToken,
  getValidatedMutationOrigin,
  isValidCsrfToken,
  setCsrfCookie,
  validateMultipartMutationRequest,
  validateMutationRequest,
} from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

function createRequest(
  token?: string,
  origin = "http://localhost:3000",
  options: Readonly<{
    contentType?: string
    headerToken?: string
    includeOrigin?: boolean
    requestUrlOrigin?: string
  }> = {},
) {
  return new NextRequest(`${options.requestUrlOrigin ?? origin}/api/auth/login`, {
    body: JSON.stringify({}),
    headers: {
      "content-type": options.contentType ?? "application/json",
      ...(token
        ? {
            cookie: `clinic_dashboard_csrf=${token}`,
            [CLINIC_DASHBOARD_CSRF_HEADER]: options.headerToken ?? token,
          }
        : {}),
      ...(options.includeOrigin === false ? {} : { origin }),
    },
    method: "POST",
  })
}

describe("CSRF contract", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
  })

  afterEach(() => vi.unstubAllEnvs())

  it("accepts a fresh same-origin JSON mutation with matching cookie and header", () => {
    const token = createCsrfToken(createRequest())
    const request = createRequest(token)
    expect(isValidCsrfToken(request, token)).toBe(true)
    expect(validateMutationRequest(request)).toBe(true)
  })

  it("accepts multipart mutations only through the dedicated validator", () => {
    const token = createCsrfToken(createRequest())
    const request = createRequest(token, undefined, {
      contentType: "multipart/form-data; boundary=doctor-image",
    })

    expect(validateMultipartMutationRequest(request)).toBe(true)
    expect(validateMutationRequest(request)).toBe(false)
  })

  it("rejects cross-origin, missing, and expired tokens", () => {
    const issuedAt = Date.now() - 9 * 60 * 60 * 1_000
    const expiredToken = createCsrfToken(createRequest(), issuedAt)
    expect(validateMutationRequest(createRequest())).toBe(false)
    expect(validateMutationRequest(createRequest(expiredToken))).toBe(false)

    const token = createCsrfToken(createRequest())
    expect(validateMutationRequest(createRequest(token, "https://attacker.example"))).toBe(false)
  })

  it("rejects invalid mutation metadata and signed-token variants", () => {
    const token = createCsrfToken(createRequest())
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`
    const futureToken = createCsrfToken(createRequest(), Date.now() + 60_000)

    expect(validateMutationRequest(createRequest(token, undefined, { includeOrigin: false }))).toBe(false)
    expect(validateMutationRequest(createRequest(token, undefined, { contentType: "text/plain" }))).toBe(
      false,
    )
    expect(
      validateMutationRequest(createRequest(token, undefined, { headerToken: `${token}-mismatch` })),
    ).toBe(false)
    expect(validateMutationRequest(createRequest(tampered))).toBe(false)
    expect(validateMutationRequest(createRequest(futureToken))).toBe(false)
  })

  it.each([
    "https://clinics.preview.findmydoc.eu",
    "https://clinic-dashboard-5gepqbsiw-findmydoc.vercel.app",
  ])("accepts a trusted preview mutation on %s", (origin) => {
    vi.stubEnv("DASHBOARD_ORIGIN", "https://clinics.preview.findmydoc.eu")
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_URL", "clinic-dashboard-5gepqbsiw-findmydoc.vercel.app")

    const token = createCsrfToken(createRequest(undefined, origin))
    const request = createRequest(token, origin)

    expect(getValidatedMutationOrigin(request)).toBe(origin)
    expect(validateMutationRequest(request)).toBe(true)
  })

  it("rejects a preview origin that is not the current deployment or request host", () => {
    vi.stubEnv("DASHBOARD_ORIGIN", "https://clinics.preview.findmydoc.eu")
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_URL", "clinic-dashboard-5gepqbsiw-findmydoc.vercel.app")

    const currentOrigin = "https://clinic-dashboard-5gepqbsiw-findmydoc.vercel.app"
    const otherDeployment = "https://clinic-dashboard-other-findmydoc.vercel.app"
    const token = createCsrfToken(createRequest(undefined, currentOrigin))

    expect(validateMutationRequest(createRequest(token, otherDeployment))).toBe(false)
    expect(
      validateMutationRequest(
        createRequest(token, currentOrigin, {
          requestUrlOrigin: "https://clinics.preview.findmydoc.eu",
        }),
      ),
    ).toBe(false)
  })

  it("writes a host-only, client-readable, same-site cookie", () => {
    const response = NextResponse.next()
    setCsrfCookie(response, "token")
    const cookie = response.cookies.get("clinic_dashboard_csrf")
    expect(cookie).toMatchObject({ httpOnly: false, path: "/", sameSite: "lax", value: "token" })
    expect(cookie?.domain).toBeUndefined()
  })
})
