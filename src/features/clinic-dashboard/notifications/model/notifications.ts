import type {
  NotificationErrorCode,
  NotificationItem,
  NotificationReadQuery,
  NotificationsResponse,
} from "./notification-schema"

export type { NotificationItem, NotificationReadQuery, NotificationsResponse }
export type NotificationView = "unread" | "all"
export type NotificationResult =
  | Readonly<{ ok: true; value: NotificationsResponse }>
  | Readonly<{ ok: false; error: NotificationErrorCode; retryAfter?: string }>
export type NotificationCommands = Readonly<{
  load: (query: NotificationReadQuery, signal?: AbortSignal) => Promise<NotificationResult>
}>
export type NotificationLoadState =
  | Readonly<{ status: "ready"; response: NotificationsResponse }>
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "unavailable"; error: NotificationErrorCode }>

export function notificationFailureCopy(error: NotificationErrorCode) {
  if (error === "CLINIC_ACCESS_DENIED" || error === "CONTENT_ACCESS_DENIED")
    return "Notifications are unavailable for this clinic."
  if (error === "UNAUTHENTICATED") return "Your session has ended. Sign in again to view notifications."
  if (error === "CONTRACT_INCOMPATIBLE") return "Notifications can't be displayed right now."
  if (error === "PAYLOAD_TOO_LARGE") return "Some notifications couldn't be loaded."
  return "Notifications couldn't be loaded."
}
