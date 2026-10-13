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
export function createControlledNotificationProvider(): NotificationProvider {
  return {
    async load(query) {
      if (query.mode === "page" && query.cursor) return { ok: false, error: "CURSOR_INVALID" }
      const envelope = {
        contractVersion: CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
        serverTime: new Date().toISOString(),
        unreadCount: 4,
        nextUnreadCountChangeAt: expiresAt,
      } as const
      return {
        ok: true,
        value:
          query.mode === "summary"
            ? { ...envelope, mode: "summary" }
            : { ...envelope, mode: "page", view: query.view, items, nextCursor: null },
      }
    },
  }
}
