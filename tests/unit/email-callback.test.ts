import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  decodeCompletionGrant,
  decodePendingEmailCallback,
  encodePendingEmailCallback,
  encodeCompletionGrant,
  validateEmailCallbackRequest,
} from "@/features/clinic-dashboard/auth/server/public"
import { GET } from "@/app/auth/callback/route"

describe("email callback validation", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv(
      "AUTH_ACTION_PROTOCOL_SERVICE_KEYS_JSON",
      JSON.stringify({
        environment: "test",
        service: [{ version: "v1", secret: "test-service-key-0123456789abcdef0123456789" }], // pragma: allowlist secret - public synthetic fixture
      }),
    )
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ version: 1, ok: true, outcome: "valid" })),
    )
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it.each([
    ["invite", "clinic-invitation", "/auth/invite/complete"],
    ["recovery", "clinic-recovery", "/auth/password/reset/complete"],
  ] as const)(
    "validates the %s reference on GET without consuming a Supabase token",
    async (type, flow, next) => {
      const request = new NextRequest(
        `http://localhost:3000/auth/callback?token_hash=synthetic&type=${type}&next=${next}&actionRef=opaque-reference`,
      )
      const response = await GET(request)
      expect(fetch).toHaveBeenCalledWith(
        new URL("https://preview.findmydoc.eu/api/internal/auth-actions/v1/validateAction"),
        expect.objectContaining({
          body: JSON.stringify({ actionRef: "opaque-reference", flow }),
          cache: "no-store",
          method: "POST",
        }),
      )
      expect(response.headers.get("location")).toBe(`http://localhost:3000/auth/confirm?type=${type}`)
      expect(response.headers.get("location")).not.toContain("synthetic")
    },
  )

  it.each([
    ["invite", "/auth/invite/complete"],
    ["recovery", "/auth/password/reset/complete"],
  ] as const)("accepts only the %s token hash destination", (type, next) => {
    const url = new URL("/auth/callback", "http://localhost:3000")
    url.searchParams.set("token_hash", "secret-token-hash")
    url.searchParams.set("actionRef", "opaque-reference")
    url.searchParams.set("type", type)
    url.searchParams.set("next", next)
    expect(validateEmailCallbackRequest(new NextRequest(url))).toEqual({
      actionRef: "opaque-reference",
      next,
      tokenHash: "secret-token-hash",
      type,
    })
  })

  it("rejects mismatched flow destinations", () => {
    expect(
      validateEmailCallbackRequest(
        new NextRequest(
          "http://localhost:3000/auth/callback?token_hash=secret&type=invite&next=/auth/password/reset/complete&actionRef=opaque-reference",
        ),
      ),
    ).toBeUndefined()
  })

  it.each([
    "https://clinics.preview.findmydoc.eu",
    "https://clinic-dashboard-5gepqbsiw-findmydoc.vercel.app",
  ])("continues a valid callback on trusted preview origin %s", async (origin) => {
    vi.stubEnv("DASHBOARD_ORIGIN", "https://clinics.preview.findmydoc.eu")
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_URL", "clinic-dashboard-5gepqbsiw-findmydoc.vercel.app")
    vi.stubEnv(
      "AUTH_ACTION_PROTOCOL_SERVICE_KEYS_JSON",
      JSON.stringify({
        environment: "preview",
        service: [{ version: "v1", secret: "test-service-key-0123456789abcdef0123456789" }], // pragma: allowlist secret - public synthetic fixture
      }),
    )
    const url = new URL("/auth/callback", origin)
    url.searchParams.set("token_hash", "secret-token-hash")
    url.searchParams.set("actionRef", "opaque-reference")
    url.searchParams.set("type", "recovery")
    url.searchParams.set("next", "/auth/password/reset/complete")

    const response = await GET(new NextRequest(url))

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(`${origin}/auth/confirm?type=recovery`)
    expect(response.headers.get("set-cookie")).toContain("clinic_dashboard_pending_email=")
  })

  it("fails closed to the canonical login for an untrusted callback origin", async () => {
    vi.stubEnv("DASHBOARD_ORIGIN", "https://clinics.preview.findmydoc.eu")
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_URL", "clinic-dashboard-5gepqbsiw-findmydoc.vercel.app")
    const url = new URL(
      "/auth/callback?token_hash=secret-token-hash&type=recovery&next=/auth/password/reset/complete&actionRef=opaque-reference",
      "https://clinic-dashboard-other-findmydoc.vercel.app",
    )

    const response = await GET(new NextRequest(url))

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(
      "https://clinics.preview.findmydoc.eu/login?error=invalid-or-expired-link",
    )
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("accepts only fresh, signed completion grants", () => {
    const now = Date.now()
    const grant = encodeCompletionGrant({
      actionRef: "opaque-reference",
      state: "confirmed",
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
    expect(decodeCompletionGrant(grant, now + 600_000)).toBeUndefined()
  })

  it("accepts the Website invitation URL without a next parameter and ignores raw IDs as authority", () => {
    const request = new NextRequest(
      "http://localhost:3000/auth/callback?token_hash=synthetic&type=invite&actionRef=opaque-reference&authActionId=42",
    )
    expect(validateEmailCallbackRequest(request)).toMatchObject({
      next: "/auth/invite/complete",
      actionRef: "opaque-reference",
    })
    request.nextUrl.searchParams.delete("actionRef")
    expect(validateEmailCallbackRequest(request)).toBeUndefined()
  })

  it("enforces pending expiry and separates environments and context purposes", () => {
    const now = Date.now()
    const pending = encodePendingEmailCallback(
      {
        actionRef: "opaque-reference",
        type: "invite",
        next: "/auth/invite/complete",
        tokenHash: "synthetic",
      },
      now,
    )
    expect(decodePendingEmailCallback(pending, now)).toBeDefined()
    expect(decodePendingEmailCallback(pending, now + 600_000)).toBeUndefined()
    expect(decodePendingEmailCallback(pending, now - 1000)).toBeUndefined()
    expect(decodeCompletionGrant(pending, now)).toBeUndefined()
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("DASHBOARD_ORIGIN", "https://clinics.preview.findmydoc.eu")
    expect(decodePendingEmailCallback(pending, now)).toBeUndefined()
  })

  it("maps the Website's closed action rejection to the uniform public error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ version: 1, ok: false, code: "INVALID_OR_EXPIRED_ACTION" }, { status: 400 }),
      ),
    )
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/callback?token_hash=synthetic&type=recovery&actionRef=opaque-reference",
      ),
    )
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?error=invalid-or-expired-link")
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("rejects duplicate callback parameters before Website transport", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/callback?token_hash=synthetic&type=invite&type=recovery&actionRef=opaque-reference",
      ),
    )
    expect(response.headers.get("location")).toContain("error=invalid-or-expired-link")
    expect(fetch).not.toHaveBeenCalled()
  })
})
