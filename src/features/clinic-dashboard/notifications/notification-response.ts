import {
  CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
  CLINIC_NOTIFICATIONS_SUPPORT_HEADER,
  NOTIFICATION_PAGE_MAX_BYTES,
  notificationErrorSchema,
  notificationsResponseSchema,
  type NotificationReadQuery,
} from "./model/notification-schema"
import type { NotificationResult } from "./model/notifications"

export const notificationErrorStatuses = {
  UNAUTHENTICATED: 401,
  CLINIC_ACCESS_DENIED: 403,
  CONTENT_ACCESS_DENIED: 403,
  INVALID_INPUT: 400,
  REQUEST_REJECTED: 403,
  TARGET_UNAVAILABLE: 404,
  CURSOR_INVALID: 400,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  SERVICE_TIMEOUT: 504,
  CONTRACT_INCOMPATIBLE: 409,
  PAYLOAD_TOO_LARGE: 413,
} as const

export async function readNotificationResponse(
  response: Response,
  query: NotificationReadQuery,
): Promise<NotificationResult> {
  const incompatible = { ok: false, error: "CONTRACT_INCOMPATIBLE" } as const
  if (
    response.headers.get(CLINIC_NOTIFICATIONS_SUPPORT_HEADER) !== CLINIC_NOTIFICATIONS_CONTRACT_VERSION ||
    !response.headers.get("content-type")?.toLowerCase().includes("application/json")
  )
    return incompatible
  const length = response.headers.get("content-length")
  if (length && (!Number.isSafeInteger(Number(length)) || Number(length) < 0)) return incompatible
  if (length && Number(length) > NOTIFICATION_PAGE_MAX_BYTES) return { ok: false, error: "PAYLOAD_TOO_LARGE" }
  const reader = response.body?.getReader()
  if (!reader) return incompatible
  const decoder = new TextDecoder("utf-8", { fatal: true })
  let bytes = 0
  let text = ""
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (bytes > NOTIFICATION_PAGE_MAX_BYTES) {
        await reader.cancel()
        return { ok: false, error: "PAYLOAD_TOO_LARGE" }
      }
      text += decoder.decode(chunk.value, { stream: true })
    }
    text += decoder.decode()
    const body: unknown = JSON.parse(text)
    if (!response.ok) {
      const parsed = notificationErrorSchema.safeParse(body)
      if (!parsed.success || notificationErrorStatuses[parsed.data.error.code] !== response.status)
        return incompatible
      const retryAfter = response.headers.get("retry-after") ?? undefined
      if (parsed.data.error.code === "RATE_LIMITED" && !retryAfter) return incompatible
      if (
        retryAfter &&
        !(/^\d+$/u.test(retryAfter) && Number.isSafeInteger(Number(retryAfter))) &&
        !Number.isFinite(Date.parse(retryAfter))
      )
        return incompatible
      return { ok: false, error: parsed.data.error.code, ...(retryAfter ? { retryAfter } : {}) }
    }
    const parsed = notificationsResponseSchema.safeParse(body)
    if (!parsed.success || parsed.data.mode !== query.mode) return incompatible
    if (parsed.data.mode === "page") {
      if (
        query.mode !== "page" ||
        parsed.data.view !== query.view ||
        (!query.cursor && !("unreadCount" in parsed.data)) ||
        (query.cursor && "unreadCount" in parsed.data)
      )
        return incompatible
      const ids = new Set<string>()
      for (const item of parsed.data.items) {
        if (ids.has(item.presentationId)) return incompatible
        ids.add(item.presentationId)
        if (
          item.members.some(
            (member) =>
              Date.parse(member.expiresAt) <= Date.parse(parsed.data.serverTime) ||
              (query.view === "unread" && member.readAt !== null),
          )
        )
          return incompatible
      }
    }
    return { ok: true, value: parsed.data }
  } catch {
    return incompatible
  } finally {
    reader.releaseLock()
  }
}
