import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import cases from "../fixtures/clinic-notifications-v1.json"

const accessMocks = vi.hoisted(() => ({ resolveClinicDashboardRouteAccess: vi.fn() }))
vi.mock("@/features/clinic-dashboard/auth/server/public", () => ({
  getClinicDashboardAccess: vi.fn(),
  getClinicDashboardAccessToken: vi.fn(),
  resolveClinicDashboardRouteAccess: accessMocks.resolveClinicDashboardRouteAccess,
}))
import { handleNotificationsLoad } from "@/features/clinic-dashboard/server"

function upstream(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "private, no-store",
      vary: "Authorization, X-Findmydoc-Clinic-Notifications-Contract",
      "X-Findmydoc-Clinic-Notifications-Support": "clinic-notifications-v1",
    },
  })
}

describe("notification BFF contract", () => {
  beforeEach(() => {
    Object.entries({
      CSRF_SIGNING_SECRET: "0123456789abcdef0123456789abcdef", // pragma: allowlist secret
      DASHBOARD_ORIGIN: "http://localhost:3000",
      EXPECTED_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
      NODE_ENV: "test",
      PAYLOAD_API_URL: "https://preview.findmydoc.eu",
      SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
    }).forEach(([key, value]) => vi.stubEnv(key, value))
    accessMocks.resolveClinicDashboardRouteAccess.mockResolvedValue({
      accessToken: "verified-session-token",
      clinicId: "verified-clinic",
      status: "approved",
      applyToResponse: (response: Response) => {
        response.headers.set("x-session-applied", "true")
        return response
      },
    })
  })
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("renders the authoritative new-inquiry case through the authenticated private BFF", async () => {
    const fixture = cases[0]!.response
    const fetcher = vi.fn<typeof fetch>(async () => upstream(fixture))
    vi.stubGlobal("fetch", fetcher)
    const response = await handleNotificationsLoad(
      new NextRequest("http://localhost:3000/api/notifications?mode=page&view=unread"),
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(fixture)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("vary")).toBe("Cookie")
    expect(response.headers.get("x-session-applied")).toBe("true")
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "https://preview.findmydoc.eu/api/clinic-dashboard/notifications?mode=page&view=unread",
    )
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      cache: "no-store",
      redirect: "error",
      headers: {
        Authorization: "Bearer verified-session-token",
        "X-Findmydoc-Clinic-Notifications-Contract": "clinic-notifications-v1",
      },
    })
  })

  it.each(cases)("accepts the independent Website-owned $name example", async ({ response: fixture }) => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => upstream(fixture)),
    )
    const query = fixture.mode === "summary" ? "mode=summary" : "mode=page&view=unread"
    const response = await handleNotificationsLoad(
      new NextRequest(`http://localhost:3000/api/notifications?${query}`),
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(fixture)
  })

  it.each([
    "",
    "?mode=summary&mode=page",
    "?mode=page",
    "?mode=summary&clinicId=foreign",
    "?mode=page&view=other",
  ])("rejects invalid selection %s before session or provider access", async (query) => {
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)
    const response = await handleNotificationsLoad(
      new NextRequest(`http://localhost:3000/api/notifications${query}`),
    )
    expect(response.status).toBe(400)
    expect(accessMocks.resolveClinicDashboardRouteAccess).not.toHaveBeenCalled()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it.each([
    ["unauthenticated", 401, "UNAUTHENTICATED"],
    ["denied", 403, "CLINIC_ACCESS_DENIED"],
    ["temporarily-unavailable", 503, "SERVICE_UNAVAILABLE"],
  ])("rejects %s with session updates and no source access", async (status, expectedStatus, code) => {
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)
    accessMocks.resolveClinicDashboardRouteAccess.mockResolvedValue({
      status,
      applyToResponse: (response: Response) => {
        response.headers.set("x-session-applied", "true")
        return response
      },
    })
    const response = await handleNotificationsLoad(
      new NextRequest("http://localhost:3000/api/notifications?mode=summary"),
    )
    expect(response.status).toBe(expectedStatus)
    await expect(response.json()).resolves.toEqual({
      contractVersion: "clinic-notifications-v1",
      error: { code },
    })
    expect(response.headers.get("x-session-applied")).toBe("true")
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("rejects unknown event versions without skipping a row or falling back to demo data", async () => {
    const fixture = structuredClone(cases[0]!.response)
    fixture.items![0]!.members[0]!.eventType = "future_event"
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => upstream(fixture)),
    )
    const response = await handleNotificationsLoad(
      new NextRequest("http://localhost:3000/api/notifications?mode=page&view=unread"),
    )
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      contractVersion: "clinic-notifications-v1",
      error: { code: "CONTRACT_INCOMPATIBLE" },
    })
  })

  it("requires initial-page summary fields and rejects summary fields on a continuation", async () => {
    const { unreadCount: _count, nextUnreadCountChangeAt: _change, ...continuation } = cases[0]!.response
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => upstream(continuation)),
    )
    expect(
      (
        await handleNotificationsLoad(
          new NextRequest("http://localhost:3000/api/notifications?mode=page&view=unread"),
        )
      ).status,
    ).toBe(409)
    expect(
      (
        await handleNotificationsLoad(
          new NextRequest("http://localhost:3000/api/notifications?mode=page&view=unread&cursor=opaque"),
        )
      ).status,
    ).toBe(200)
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => upstream(cases[0]!.response)),
    )
    expect(
      (
        await handleNotificationsLoad(
          new NextRequest("http://localhost:3000/api/notifications?mode=page&view=unread&cursor=opaque"),
        )
      ).status,
    ).toBe(409)
  })

  it("rejects an oversized streamed response without returning a truncated group", async () => {
    const oversized = " ".repeat(524_289)
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        const response = upstream(cases[0]!.response)
        return new Response(oversized, { headers: response.headers })
      }),
    )
    const response = await handleNotificationsLoad(
      new NextRequest("http://localhost:3000/api/notifications?mode=page&view=unread"),
    )
    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toEqual({
      contractVersion: "clinic-notifications-v1",
      error: { code: "PAYLOAD_TOO_LARGE" },
    })
  })

  it("preserves validated throttling and never exposes upstream detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        const response = upstream(
          { contractVersion: "clinic-notifications-v1", error: { code: "RATE_LIMITED" } },
          429,
        )
        response.headers.set("retry-after", "30")
        return response
      }),
    )
    const response = await handleNotificationsLoad(
      new NextRequest("http://localhost:3000/api/notifications?mode=summary"),
    )
    expect(response.status).toBe(429)
    expect(response.headers.get("retry-after")).toBe("30")
    await expect(response.json()).resolves.toEqual({
      contractVersion: "clinic-notifications-v1",
      error: { code: "RATE_LIMITED" },
    })
  })
})
