import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:crypto", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:crypto")>()),
  randomUUID: () => "11111111-1111-4111-8111-111111111111",
}))

import { GET } from "@/app/auth/callback/route"

const fixtureKeys = {
  environment: "test",
  service: [{ version: "v1", secret: "test-service-key-0123456789abcdef0123456789" }], // pragma: allowlist secret - public synthetic fixture
}
const request = () =>
  new NextRequest(
    "http://localhost:3000/auth/callback?token_hash=synthetic&type=invite&actionRef=opaque-reference",
  )

describe("Dashboard Website protocol wire contract", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-04T03:00:00.000Z"))
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("VERCEL_ENV", undefined)
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef") // pragma: allowlist secret - public synthetic fixture
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    vi.stubEnv("AUTH_ACTION_PROTOCOL_SERVICE_KEYS_JSON", JSON.stringify(fixtureKeys))
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ version: 1, ok: true, outcome: "valid" })),
    )
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("matches the pinned v1 HMAC example over the exact request bytes", async () => {
    const response = await GET(request())
    expect(fetch).toHaveBeenCalledWith(
      new URL("https://preview.findmydoc.eu/api/internal/auth-actions/v1/validateAction"),
      expect.objectContaining({
        body: '{"actionRef":"opaque-reference","flow":"clinic-invitation"}',
        method: "POST",
        cache: "no-store",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          "x-auth-action-timestamp": "2026-10-04T03:00:00.000Z",
          "x-auth-action-request-id": "11111111-1111-4111-8111-111111111111",
          "x-auth-action-key-version": "v1",
          "x-auth-action-signature": "c12cc6f0129116c80030a24ea2dcb0b69d3022d70057a08f270d7e1405f5ed6f", // pragma: allowlist secret - public synthetic fixture
        },
      }),
    )
    expect(response.headers.get("referrer-policy")).toBe("no-referrer")
    expect(response.headers.get("cache-control")).toBe("private, no-store")
  })

  it.each([
    undefined,
    "",
    "{}",
    JSON.stringify({ ...fixtureKeys, environment: "production" }),
    JSON.stringify({ ...fixtureKeys, reference: fixtureKeys.service }),
    JSON.stringify({ ...fixtureKeys, service: [...fixtureKeys.service, ...fixtureKeys.service] }),
  ])("fails closed before transport for missing or mismatched service configuration", async (value) => {
    vi.stubEnv("AUTH_ACTION_PROTOCOL_SERVICE_KEYS_JSON", value)
    const response = await GET(request())
    expect(fetch).not.toHaveBeenCalled()
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?error=temporarily-unavailable")
  })

  it.each([
    Response.json({ version: 1, ok: true, outcome: "completed" }),
    Response.json({ version: 1, ok: true, outcome: "valid", subject: "unexpected" }),
    Response.json({ code: "raw-provider-detail" }, { status: 400 }),
    new Response("malformed"),
    new Response("x".repeat(2049)),
    new Response(null, { status: 302, headers: { location: "https://untrusted.example.invalid" } }),
  ])("sanitizes uncertain or malformed upstream responses", async (fixture) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => fixture.clone()),
    )
    const response = await GET(request())
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?error=temporarily-unavailable")
    expect(response.headers.get("set-cookie")).toBeNull()
  })
})
