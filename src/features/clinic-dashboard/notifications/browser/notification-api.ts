import { readBrowserCsrfToken, CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"
import { readNotificationResponse, readNotificationMarkResponse } from "../notification-response"
import { NOTIFICATION_READ_MAX_BYTES, notificationReadInputSchema } from "../model/notification-schema"
import type { NotificationCommands } from "../model/notifications"

export function createNotificationApiCommands(fetcher: typeof fetch = fetch): NotificationCommands {
  return {
    async markRead(input, signal) {
      const parsed = notificationReadInputSchema.safeParse(input)
      if (!parsed.success) return { ok: false, error: "INVALID_INPUT", writeOutcome: "not_committed" }
      const body = JSON.stringify(parsed.data)
      if (new TextEncoder().encode(body).byteLength > NOTIFICATION_READ_MAX_BYTES)
        return { ok: false, error: "PAYLOAD_TOO_LARGE", writeOutcome: "not_committed" }
      const token = readBrowserCsrfToken()
      if (!token || signal?.aborted)
        return { ok: false, error: "REQUEST_REJECTED", writeOutcome: "not_committed" }
      const timeout = AbortSignal.timeout(8_000)
      try {
        const response = await fetcher("/api/notifications/read", {
          method: "POST",
          body,
          cache: "no-store",
          credentials: "same-origin",
          redirect: "error",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            [CLINIC_DASHBOARD_CSRF_HEADER]: token,
          },
          signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
        })
        return await readNotificationMarkResponse(response)
      } catch {
        return {
          ok: false,
          error: timeout.aborted ? "SERVICE_TIMEOUT" : "SERVICE_UNAVAILABLE",
          writeOutcome: "unknown",
        }
      }
    },
    async load(query, signal) {
      const params = new URLSearchParams(Object.entries(query))
      const timeout = AbortSignal.timeout(8_000)
      try {
        const response = await fetcher(`/api/notifications?${params}`, {
          cache: "no-store",
          credentials: "same-origin",
          redirect: "error",
          headers: { Accept: "application/json" },
          signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
        })
        return await readNotificationResponse(response, query)
      } catch {
        return { ok: false, error: timeout.aborted ? "SERVICE_TIMEOUT" : "SERVICE_UNAVAILABLE" }
      }
    },
  }
}
