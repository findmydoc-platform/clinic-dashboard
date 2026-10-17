import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createControlledNotificationProvider,
  resetControlledNotificationProvider,
} from "@/features/clinic-dashboard/notifications/server/controlled-notifications"
import { createPayloadNotificationProvider } from "@/features/clinic-dashboard/notifications/server/payload-notifications"
import type { NotificationProvider } from "@/features/clinic-dashboard/notifications/server/notification-provider"
import cases from "../fixtures/clinic-notifications-v1.json"

const environment = {
  CSRF_SIGNING_SECRET: "0123456789abcdef0123456789abcdef", // pragma: allowlist secret
  DASHBOARD_ORIGIN: "http://localhost:3000",
  EXPECTED_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
  NODE_ENV: "test",
  PAYLOAD_API_URL: "https://preview.findmydoc.eu",
  SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
}
describe("notification provider read contract", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetControlledNotificationProvider()
  })
  it("retains personal first receipts across provider composition without changing another reader", async () => {
    const first = createControlledNotificationProvider("token-a", "reader-a", ["controlled-clinic"])
    await first.markRead({ notificationIds: ["controlled-notification-0"] })
    const reloaded = createControlledNotificationProvider("token-a", "reader-a", ["controlled-clinic"])
    const all = await reloaded.load({ mode: "page", view: "all" })
    expect(all).toMatchObject({
      ok: true,
      value: { unreadCount: 3, items: [{ members: [{ readAt: expect.any(String) }] }, {}, {}, {}] },
    })
    const readAt = all.ok && all.value.mode === "page" ? all.value.items[0]?.members[0]?.readAt : null
    await reloaded.markRead({ notificationIds: ["controlled-notification-0"] })
    const repeated = await createControlledNotificationProvider("token-a", "reader-a", [
      "controlled-clinic",
    ]).load({
      mode: "page",
      view: "all",
    })
    expect(
      repeated.ok && repeated.value.mode === "page" ? repeated.value.items[0]?.members[0]?.readAt : null,
    ).toBe(readAt)
    expect(
      await createControlledNotificationProvider("token-b", "reader-b", ["controlled-clinic"]).load({
        mode: "summary",
      }),
    ).toMatchObject({ ok: true, value: { unreadCount: 4 } })
    expect(
      await createControlledNotificationProvider("rotated-token", "reader-a", [
        "controlled-second-clinic",
      ]).load({ mode: "summary" }),
    ).toMatchObject({ ok: true, value: { unreadCount: 28 } })
    expect(
      await createControlledNotificationProvider("new-token", "reader-a", ["controlled-clinic"]).load({
        mode: "summary",
      }),
    ).toMatchObject({ ok: true, value: { unreadCount: 3 } })
  })
  it("exposes validated complete summary and feed through both providers", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async (url) =>
        new Response(
          JSON.stringify(
            String(url).includes("mode=summary")
              ? cases.find((item) => item.name === "empty_summary")!.response
              : cases[0]!.response,
          ),
          {
            headers: {
              "content-type": "application/json",
              "cache-control": "private, no-store",
              vary: "Authorization, X-Findmydoc-Clinic-Notifications-Contract, X-Findmydoc-Clinic-Scope-Contract",
              "X-Findmydoc-Clinic-Notifications-Support": "clinic-notifications-v1",
            },
          },
        ),
    )
    const providers: NotificationProvider[] = [
      createControlledNotificationProvider(),
      createPayloadNotificationProvider("verified-token", "verified-clinic", fetcher, environment),
    ]
    for (const provider of providers) {
      expect(await provider.load({ mode: "summary" })).toMatchObject({
        ok: true,
        value: {
          mode: "summary",
          contractVersion: "clinic-notifications-v1",
          unreadCount: expect.any(Number),
        },
      })
      expect(await provider.load({ mode: "page", view: "unread" })).toMatchObject({
        ok: true,
        value: { mode: "page", view: "unread", items: expect.any(Array) },
      })
    }
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true)
  })
})
