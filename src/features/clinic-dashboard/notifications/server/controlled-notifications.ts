import "server-only"
import type { NotificationItem } from "../model/notifications"
import {
  CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
  NOTIFICATION_RETENTION_MS,
} from "../model/notification-schema"
import type { NotificationProvider } from "./notification-provider"

const occurredAt = new Date(Date.now() - 60_000).toISOString()
const expiresAt = new Date(Date.parse(occurredAt) + NOTIFICATION_RETENTION_MS).toISOString()
const items: NotificationItem[] = ["Ada Patient", "Jamie Carter", "Taylor Smith", "Alex Morgan"].map(
  (displayName, index) => ({
    kind: "occurrence",
    presentationId: `controlled-notification-${index}`,
    display: { eventLabel: "New inquiry", displayName },
    destination: { kind: "inquiry", inquiryId: `controlled-inquiry-${index}` },
    members: [
      {
        notificationId: `controlled-notification-${index}`,
        schemaVersion: 1,
        occurredAt,
        expiresAt,
        readAt: null,
        eventType: "inquiry_created",
        sourceRecord: { kind: "inquiry", id: `controlled-inquiry-${index}` },
        sourceOccurrence: { kind: "inquiry_audit", id: `controlled-audit-${index}` },
      },
    ],
  }),
)
const receipts = new Map<string, Map<string, string>>()
export function resetControlledNotificationProvider() {
  receipts.clear()
}
export function createControlledNotificationProvider(
  accessToken = "controlled",
  clinicId = "controlled",
): NotificationProvider {
  const principal = JSON.stringify([clinicId, accessToken])
  const personal = receipts.get(principal) ?? new Map<string, string>()
  receipts.set(principal, personal)
  return {
    async markRead(input) {
      const now = new Date().toISOString()
      for (const item of items)
        for (const member of item.members) {
          if (
            input.notificationIds.includes(member.notificationId) &&
            Date.parse(member.expiresAt) > Date.now() &&
            !personal.has(member.notificationId)
          )
            personal.set(member.notificationId, now)
        }
      return {
        ok: true,
        value: {
          contractVersion: CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
          serverTime: now,
          acknowledged: true,
        },
      }
    },
    async load(query) {
      if (query.mode === "page" && query.cursor) return { ok: false, error: "CURSOR_INVALID" }
      const visible = items
        .filter((item) => Date.parse(item.members[0]!.expiresAt) > Date.now())
        .map((item) => ({
          ...item,
          members: item.members.map((member) => ({
            ...member,
            readAt: personal.get(member.notificationId) ?? null,
          })),
        }))
      const unread = visible.filter((item) => item.members.some((member) => member.readAt === null))
      const envelope = {
        contractVersion: CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
        serverTime: new Date().toISOString(),
        unreadCount: unread.length,
        nextUnreadCountChangeAt: unread.length ? expiresAt : null,
      } as const
      return {
        ok: true,
        value:
          query.mode === "summary"
            ? { ...envelope, mode: "summary" }
            : {
                ...envelope,
                mode: "page",
                view: query.view,
                items: query.view === "unread" ? unread : visible,
                nextCursor: null,
              },
      }
    },
  }
}
