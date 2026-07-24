import { NextRequest, NextResponse } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { createServerClientMock } = vi.hoisted(() => ({ createServerClientMock: vi.fn() }))

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}))

import { createRouteSupabaseClient } from "@/features/clinic-dashboard/auth/server/supabase-client"

describe("Supabase cookie adapter", () => {
  beforeEach(() => {
    createServerClientMock.mockImplementation((_url, _key, options) => ({ options }))
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "https://clinic-dashboard-preview-findmydoc.vercel.app")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    vi.stubEnv("VERCEL_ENV", "preview")
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("forces host-only HttpOnly session cookies and forwards Supabase response headers", () => {
    const routeClient = createRouteSupabaseClient(
      new NextRequest("https://clinic-dashboard-preview-findmydoc.vercel.app/api/auth/login"),
    )
    const configuredClient = routeClient.client as unknown as {
      options: {
        cookies: {
          setAll: (
            cookies: readonly Readonly<{
              name: string
              options: Record<string, unknown>
              value: string
            }>[],
            headers: Record<string, string>,
          ) => void
        }
      }
    }

    configuredClient.options.cookies.setAll(
      [
        {
          name: "clinic-dashboard-auth.0",
          options: { domain: "example.com", httpOnly: false, sameSite: "none", secure: false },
          value: "session-value",
        },
      ],
      { "x-supabase-auth": "preserved" },
    )

    const response = routeClient.applyToResponse(NextResponse.json({ ok: true }))
    const cookie = response.cookies.get("clinic-dashboard-auth.0")
    expect(cookie).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
      value: "session-value",
    })
    expect(cookie?.domain).toBeUndefined()
    expect(response.headers.get("x-supabase-auth")).toBe("preserved")
    expect(response.headers.get("cache-control")).toBe("private, no-store")
  })
})
