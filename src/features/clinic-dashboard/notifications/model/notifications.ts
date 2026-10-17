import type {
  NotificationErrorCode,
  NotificationItem,
  NotificationReadQuery,
  NotificationsResponse,
  NotificationReadSuccess,
} from "./notification-schema"

export type { NotificationItem, NotificationReadQuery, NotificationsResponse }
export type NotificationView = "unread" | "all"
export function visibleNotificationItems(
  items: readonly NotificationItem[],
  now: number,
): NotificationItem[] {
  const visible: NotificationItem[] = []
  for (const item of items) {
    const members = item.members.filter((member) => Date.parse(member.expiresAt) > now)
    if (!members.length) continue
    if (item.kind === "patient_message_group") {
      const oldest = members[0]!
      const anchorId = oldest.sourceOccurrence.id
      visible.push({
        ...item,
        members,
        display: {
          ...item.display,
          eventLabel: members.length === 1 ? "1 new message" : `${members.length} new messages`,
        },
        destination:
          item.members[0]?.notificationId === oldest.notificationId
            ? item.destination
            : {
                kind: "inquiry",
                inquiryId: oldest.sourceRecord.id,
                ...(anchorId.length <= 200 ? { anchor: { kind: "message", id: anchorId } as const } : {}),
              },
      })
    } else visible.push(item)
  }
  return visible.sort((left, right) => {
    const newestLeft = left.members.at(-1)!
    const newestRight = right.members.at(-1)!
    return (
      newestRight.occurredAt.localeCompare(newestLeft.occurredAt) ||
      newestRight.sourceOccurrence.id.localeCompare(newestLeft.sourceOccurrence.id, "en", {
        numeric: true,
      }) ||
      newestRight.notificationId.localeCompare(newestLeft.notificationId) ||
      right.presentationId.localeCompare(left.presentationId)
    )
  })
}

export function nextNotificationExpiry(items: readonly NotificationItem[], now: number): number | undefined {
  let next: number | undefined
  for (const item of items)
    for (const member of item.members) {
      const expiry = Date.parse(member.expiresAt)
      if (expiry > now && (next === undefined || expiry < next)) next = expiry
    }
  return next
}
export function displayedUnreadSelection(items: readonly NotificationItem[]) {
  const notificationIds = new Set<string>()
  let entryCount = 0
  for (const item of items) {
    if (!item.members.some((member) => member.readAt === null)) continue
    entryCount += 1
    for (const member of item.members) notificationIds.add(member.notificationId)
  }
  return { entryCount, notificationIds: [...notificationIds] } as const
}
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
    return "Notifications are unavailable for your current clinic access."
  if (error === "UNAUTHENTICATED") return "Your session has ended. Sign in again to view notifications."
  if (error === "CONTRACT_INCOMPATIBLE") return "Notifications can't be displayed right now."
  if (error === "PAYLOAD_TOO_LARGE") return "Some notifications couldn't be loaded."
  return "Notifications couldn't be loaded."
}

export type NotificationOpeningRequest = Readonly<{
  requestId: string
  clinicId: string
  destination: NotificationItem["destination"]
}>
export type NotificationOpeningOutcome = "displayed" | "unavailable" | "cancelled"
export type NotificationDestinationOpen = (
  request: NotificationOpeningRequest,
  signal: AbortSignal,
) => Promise<NotificationOpeningOutcome>
export type NotificationOpeningState = "idle" | "pending" | NotificationOpeningOutcome
