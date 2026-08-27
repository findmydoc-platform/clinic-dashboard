import { NextRequest, NextResponse } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { getClaimsMock } = vi.hoisted(() => ({
  getClaimsMock: vi.fn(),
}))

vi.mock("@/features/clinic-dashboard/auth/server/public", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/clinic-dashboard/auth/server/public")>()
  return {
    ...actual,
    createProxySupabaseClient: (request: NextRequest) => ({
      client: { auth: { getClaims: getClaimsMock } },
      getResponse: () => NextResponse.next({ request }),
    }),
  }
})

import { proxy } from "@/proxy"

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe("private, no-store")
  expect(response.headers.get("pragma")).toBe("no-cache")
  expect(response.headers.get("expires")).toBe("0")
}

describe("proxy route and cache contract", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    getClaimsMock.mockResolvedValue({ data: { claims: null }, error: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("issues public-form CSRF and private cache headers on the auth surface", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/login"))
    expect(response.status).toBe(200)
    expect(response.headers.get("set-cookie")).toContain("clinic_dashboard_csrf=")
    expect(response.headers.get("x-robots-tag")).toContain("noindex")
    expectPrivate(response)
  })

  it("redirects an unauthenticated protected page and preserves private headers", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/"))
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost:3000/login")
    expectPrivate(response)
  })

  it("preserves one safe inquiry deep link in the same-origin login return target", async () => {
    const response = await proxy(
      new NextRequest("http://localhost:3000/?inquiry=inquiry-lukas-weber&untrusted=discarded"),
    )

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2F%3Finquiry%3Dinquiry-lukas-weber",
    )
  })

  it.each([
    "http://localhost:3000/?inquiry=unsafe%2Finquiry",
    "http://localhost:3000/?inquiry=inquiry-1&inquiry=inquiry-2",
    "http://localhost:3000/reviews?inquiry=inquiry-lukas-weber",
  ])("fails closed when a protected request is not a canonical inquiry target: %s", async (url) => {
    const response = await proxy(new NextRequest(url))

    expect(response.headers.get("location")).toBe("http://localhost:3000/login")
  })

  it("passes API authorization to the Route Handler without making it public-cacheable", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/api/dashboard/bootstrap"))
    expect(response.status).toBe(200)
    expectPrivate(response)
  })

  it("passes a verified session and issues session-bound CSRF", async () => {
    getClaimsMock.mockResolvedValueOnce({
      data: { claims: { sub: "clinic-staff-1" } },
      error: null,
    })
    const response = await proxy(new NextRequest("http://localhost:3000/"))
    expect(response.status).toBe(200)
    expect(response.headers.get("set-cookie")).toContain("clinic_dashboard_csrf=")
    expectPrivate(response)
  })
})
