import { readNotificationResponse } from "../notification-response"
import type { NotificationCommands } from "../model/notifications"

export function createNotificationApiCommands(fetcher: typeof fetch = fetch): NotificationCommands {
  return {
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
