import type {
  NotificationErrorCode,
  NotificationItem,
  NotificationReadQuery,
  NotificationsResponse,
  NotificationReadSuccess,
} from "./notification-schema"

export type { NotificationItem, NotificationReadQuery, NotificationsResponse }
export type NotificationView = "unread" | "all"
export type NotificationResult =
  | Readonly<{ ok: true; value: NotificationsResponse }>
  | Readonly<{ ok: false; error: NotificationErrorCode; retryAfter?: string }>
export type NotificationCommands = Readonly<{
  load: (query: NotificationReadQuery, signal?: AbortSignal) => Promise<NotificationResult>
  markRead: (
    input: Readonly<{ notificationIds: readonly string[] }>,
    signal?: AbortSignal,
  ) => Promise<NotificationMarkResult>
}>
export type NotificationMarkResult =
  | Readonly<{ ok: true; value: NotificationReadSuccess }>
  | Readonly<{
      ok: false
      error: NotificationErrorCode
      writeOutcome: "not_committed" | "unknown"
      retryAfter?: string
    }>
export type NotificationLoadState =
  | Readonly<{ status: "ready"; response: NotificationsResponse }>
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "unavailable"; error: NotificationErrorCode }>

export type NotificationPaginationState =
  | Readonly<{ status: "idle" | "loading" }>
  | Readonly<{ status: "unavailable"; error: NotificationErrorCode; retryAt?: number }>

export type NotificationMarkState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "pending"; notificationIds: readonly string[] }>
  | Readonly<{ status: "confirmed" | "refresh-failed"; notificationIds: readonly string[] }>
  | Readonly<{
      status: "rejected" | "unknown"
      notificationIds: readonly string[]
      error: NotificationErrorCode
      retryAt?: number
    }>

export function notificationRetryAt(retryAfter: string | undefined, now: number) {
  if (!retryAfter) return undefined
  return /^\d+$/u.test(retryAfter) ? now + Number(retryAfter) * 1_000 : Date.parse(retryAfter)
}

export function notificationFailureCopy(error: NotificationErrorCode) {
  if (error === "CLINIC_ACCESS_DENIED" || error === "CONTENT_ACCESS_DENIED")
    return "Notifications are unavailable for this clinic."
  if (error === "UNAUTHENTICATED") return "Your session has ended. Sign in again to view notifications."
  if (error === "CONTRACT_INCOMPATIBLE") return "Notifications can't be displayed right now."
  if (error === "PAYLOAD_TOO_LARGE") return "Some notifications couldn't be loaded."
  return "Notifications couldn't be loaded."
}

export type NotificationOpeningRequest = Readonly<{
  requestId: string
  destination: NotificationItem["destination"]
}>
export type NotificationOpeningOutcome = "displayed" | "unavailable" | "cancelled"
export type NotificationDestinationOpen = (
  request: NotificationOpeningRequest,
  signal: AbortSignal,
) => Promise<NotificationOpeningOutcome>
export type NotificationOpeningState = "idle" | "pending" | NotificationOpeningOutcome
