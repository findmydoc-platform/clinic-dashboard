import { afterEach, describe, expect, it, vi } from "vitest"
import { createControlledNotificationProvider } from "@/features/clinic-dashboard/notifications/server/controlled-notifications"
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
  afterEach(() => vi.restoreAllMocks())
  it("exposes validated complete summary and feed through both providers", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async (url) =>
        new Response(
          JSON.stringify(String(url).includes("mode=summary") ? cases.at(-1)!.response : cases[0]!.response),
          {
            headers: {
              "content-type": "application/json",
              "cache-control": "private, no-store",
              vary: "Authorization, X-Findmydoc-Clinic-Notifications-Contract",
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
