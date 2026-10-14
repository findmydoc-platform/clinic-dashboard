import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import cases from "../fixtures/clinic-notifications-v1.json"
import readCases from "../fixtures/clinic-notification-read-v1.json"

const accessMocks = vi.hoisted(() => ({ resolveClinicDashboardRouteAccess: vi.fn() }))
vi.mock("@/features/clinic-dashboard/auth/server/public", () => ({
  getClinicDashboardAccess: vi.fn(),
  getClinicDashboardAccessToken: vi.fn(),
  resolveClinicDashboardRouteAccess: accessMocks.resolveClinicDashboardRouteAccess,
}))
import { handleNotificationsLoad } from "@/features/clinic-dashboard/server"
import { handleNotificationsMarkRead } from "@/features/clinic-dashboard/server"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_COOKIE, CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

function markingRequest(body: string, extraHeaders: Record<string, string> = {}) {
  const token = createCsrfToken(new NextRequest("http://localhost:3000/api/notifications/read"))
  return new NextRequest("http://localhost:3000/api/notifications/read", {
    method: "POST",
    body,
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      cookie: `${CLINIC_DASHBOARD_CSRF_COOKIE}=${token}`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
      ...extraHeaders,
    },
  })
}

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

  it("returns a handled read failure even when the technical diagnostic sink fails", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw new Error("Synthetic private upstream failure")
    })
    vi.stubGlobal("fetch", fetcher)
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("Diagnostic sink unavailable")
    })
    try {
      const response = await handleNotificationsLoad(
        new NextRequest("http://localhost:3000/api/notifications?mode=page&view=unread"),
      )
      expect(response.status).toBe(503)
      await expect(response.json()).resolves.toMatchObject({ error: { code: "SERVICE_UNAVAILABLE" } })
      expect(diagnostic).toHaveBeenCalledOnce()
      const fields = JSON.parse(String(diagnostic.mock.calls[0]?.[0])) as Record<string, unknown>
      expect(fields).toMatchObject({
        event: "clinic_dashboard.notifications.read",
        application: "clinic-dashboard",
        operation: "feed_read",
        errorCode: "SERVICE_UNAVAILABLE",
      })
      expect(fields.elapsedMs).toEqual(expect.any(Number))
      expect(JSON.stringify(fields)).not.toMatch(
        /verified-session-token|verified-clinic|Synthetic private upstream failure/,
      )
    } finally {
      diagnostic.mockRestore()
    }
  })

  it("marks exactly the supplied personal selection through the private guarded BFF", async () => {
    const fixture = {
      contractVersion: "clinic-notifications-v1",
      serverTime: "2026-10-14T09:01:00.000Z",
      acknowledged: true,
    }
    const fetcher = vi.fn<typeof fetch>(async () => upstream(fixture))
    vi.stubGlobal("fetch", fetcher)
    const response = await handleNotificationsMarkRead(
      markingRequest('{"notificationIds":["notification-a","notification-b"]}'),
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(fixture)
    expect(response.headers.get("x-session-applied")).toBe("true")
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: '{"notificationIds":["notification-a","notification-b"]}',
      redirect: "error",
      cache: "no-store",
    })
  })
  it.each(readCases)(
    "accepts the literal Website-owned marking $name case",
    async ({ response: fixture, status, retryAfter }) => {
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(async () => {
          const response = upstream(fixture, status)
          if (retryAfter) response.headers.set("retry-after", retryAfter)
          return response
        }),
      )
      const response = await handleNotificationsMarkRead(
        markingRequest('{"notificationIds":["notification-a"]}'),
      )
      expect(response.status).toBe(status)
      await expect(response.json()).resolves.toEqual(fixture)
    },
  )
  it.each([
    ['{"notificationIds":[],"clinicId":"foreign"}', "INVALID_INPUT", 400],
    ['{"notificationIds":[],"readAt":"2026-10-14T09:00:00.000Z"}', "INVALID_INPUT", 400],
    ['{"notificationIds":"notification-a"}', "INVALID_INPUT", 400],
    ['{"notificationIds":[""]}', "INVALID_INPUT", 400],
    ["{", "INVALID_INPUT", 400],
  ])("rejects invalid personal marking before any write: %s", async (body, code, status) => {
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)
    const response = await handleNotificationsMarkRead(markingRequest(body))
    expect(response.status).toBe(status)
    await expect(response.json()).resolves.toEqual({
      contractVersion: "clinic-notifications-v1",
      error: { code },
      writeOutcome: "not_committed",
    })
    expect(fetcher).not.toHaveBeenCalled()
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("x-session-applied")).toBe("true")
  })
  it.each([
    { origin: "https://foreign.example" },
    { "x-csrf-token": "invalid" },
    { "content-type": "text/plain" },
    { "content-type": "application/jsonevil" },
  ] as Record<string, string>[])(
    "rejects invalid mutation guard before session/source: %j",
    async (headers) => {
      const fetcher = vi.fn()
      vi.stubGlobal("fetch", fetcher)
      const response = await handleNotificationsMarkRead(markingRequest('{"notificationIds":[]}', headers))
      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "REQUEST_REJECTED" },
        writeOutcome: "not_committed",
      })
      expect(accessMocks.resolveClinicDashboardRouteAccess).not.toHaveBeenCalled()
      expect(fetcher).not.toHaveBeenCalled()
    },
  )
  it("enforces the actual 4 MiB UTF-8 body boundary before an atomic write", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      upstream({
        contractVersion: "clinic-notifications-v1",
        serverTime: "2026-10-14T09:01:00.000Z",
        acknowledged: true,
      }),
    )
    vi.stubGlobal("fetch", fetcher)
    const valid = '{"notificationIds":[]}'
    const exact = valid + " ".repeat(4_194_304 - new TextEncoder().encode(valid).byteLength)
    expect((await handleNotificationsMarkRead(markingRequest(exact))).status).toBe(200)
    const tooLarge = await handleNotificationsMarkRead(markingRequest(exact + " "))
    expect(tooLarge.status).toBe(413)
    await expect(tooLarge.json()).resolves.toMatchObject({
      writeOutcome: "not_committed",
      error: { code: "PAYLOAD_TOO_LARGE" },
    })
    const declared = await handleNotificationsMarkRead(markingRequest(valid, { "content-length": "4194305" }))
    expect(declared.status).toBe(413)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it("sends a large complete selection once with no numeric cap or independent chunks", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      upstream({
        contractVersion: "clinic-notifications-v1",
        serverTime: "2026-10-14T09:01:00.000Z",
        acknowledged: true,
      }),
    )
    vi.stubGlobal("fetch", fetcher)
    const notificationIds = Array.from({ length: 12_001 }, (_, i) => `notification-${i}`)
    const response = await handleNotificationsMarkRead(markingRequest(JSON.stringify({ notificationIds })))
    expect(response.status).toBe(200)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({ notificationIds })
  })
  it.each([{ notificationIds: [] }, { notificationIds: ["notification-a", "notification-a"] }])(
    "preserves an authorized empty or repeated selection %j",
    async ({ notificationIds }) => {
      const fetcher = vi.fn<typeof fetch>(async () =>
        upstream({
          contractVersion: "clinic-notifications-v1",
          serverTime: "2026-10-14T09:01:00.000Z",
          acknowledged: true,
        }),
      )
      vi.stubGlobal("fetch", fetcher)
      expect(
        (await handleNotificationsMarkRead(markingRequest(JSON.stringify({ notificationIds })))).status,
      ).toBe(200)
    },
  )
  it.each(["not_committed", "unknown"])(
    "preserves explicit %s outcome and validated Retry-After without retry",
    async (writeOutcome) => {
      const fetcher = vi.fn<typeof fetch>(async () => {
        const response = upstream(
          { contractVersion: "clinic-notifications-v1", error: { code: "RATE_LIMITED" }, writeOutcome },
          429,
        )
        response.headers.set("retry-after", "30")
        return response
      })
      vi.stubGlobal("fetch", fetcher)
      const response = await handleNotificationsMarkRead(
        markingRequest('{"notificationIds":["notification-a"]}'),
      )
      expect(response.status).toBe(429)
      expect(response.headers.get("retry-after")).toBe("30")
      await expect(response.json()).resolves.toMatchObject({ writeOutcome })
      expect(fetcher).toHaveBeenCalledTimes(1)
    },
  )
  it("reports an unknown write after a lost response and never automatically repeats it", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw new Error("Connection lost after submission")
    })
    vi.stubGlobal("fetch", fetcher)
    const response = await handleNotificationsMarkRead(
      markingRequest('{"notificationIds":["notification-a"]}'),
    )
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      writeOutcome: "unknown",
      error: { code: "SERVICE_UNAVAILABLE" },
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each([
    [
      {
        contractVersion: "clinic-notifications-v2",
        serverTime: "2026-10-14T09:01:00.000Z",
        acknowledged: true,
      },
      200,
    ],
    [
      {
        contractVersion: "clinic-notifications-v1",
        serverTime: "2026-10-14T09:01:00.000Z",
        acknowledged: true,
        notificationIds: ["protected"],
      },
      200,
    ],
    [{ contractVersion: "clinic-notifications-v1", error: { code: "SERVICE_UNAVAILABLE" } }, 503],
  ])("treats an invalid submitted-write response as unknown", async (body, status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => upstream(body, status as number)),
    )
    const response = await handleNotificationsMarkRead(
      markingRequest('{"notificationIds":["notification-a"]}'),
    )
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      contractVersion: "clinic-notifications-v1",
      error: { code: "CONTRACT_INCOMPATIBLE" },
      writeOutcome: "unknown",
    })
  })

  it.each(cases)("accepts the independent Website-owned $name example", async ({ response: fixture }) => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => upstream(fixture)),
    )
    const query =
      fixture.mode === "summary"
        ? "mode=summary"
        : `mode=page&view=${fixture.view}${"unreadCount" in fixture ? "" : "&cursor=opaque-page-2"}`
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

  it.each([
    ["empty with a continuation", [], "next-page"],
    ["repeated cursor", cases[0]!.response.items!, "opaque"],
  ])("rejects a %s page instead of forwarding it to the browser", async (_name, items, nextCursor) => {
    const { unreadCount: _count, nextUnreadCountChangeAt: _change, ...continuation } = cases[0]!.response
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => upstream({ ...continuation, items, nextCursor })),
    )
    const response = await handleNotificationsLoad(
      new NextRequest("http://localhost:3000/api/notifications?mode=page&view=unread&cursor=opaque"),
    )
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      contractVersion: "clinic-notifications-v1",
      error: { code: "CONTRACT_INCOMPATIBLE" },
    })
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
