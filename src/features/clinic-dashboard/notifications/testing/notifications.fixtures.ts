import type { NotificationCommands, NotificationsResponse } from "../model/notifications"

export const notificationPageFixture = {
  contractVersion: "clinic-notifications-v1",
  serverTime: "2026-10-14T09:00:01.000Z",
  mode: "page",
  view: "unread",
  unreadCount: 2,
  nextUnreadCountChangeAt: "2027-01-12T09:00:00.000Z",
  nextCursor: null,
  items: [
    {
      kind: "occurrence",
      presentationId: "fixture-notification-1",
      display: { eventLabel: "New inquiry", displayName: "Ada Patient" },
      destination: { kind: "inquiry", inquiryId: "fixture-inquiry-1" },
      members: [
        {
          notificationId: "fixture-notification-1",
          schemaVersion: 1,
          occurredAt: "2026-10-14T09:00:00.000Z",
          expiresAt: "2027-01-12T09:00:00.000Z",
          readAt: null,
          eventType: "inquiry_created",
          sourceRecord: { kind: "inquiry", id: "fixture-inquiry-1" },
          sourceOccurrence: { kind: "inquiry_audit", id: "fixture-audit-1" },
        },
      ],
    },
    {
      kind: "occurrence",
      presentationId: "fixture-notification-2",
      display: { eventLabel: "New inquiry", displayName: "Jamie Carter" },
      destination: { kind: "inquiry", inquiryId: "fixture-inquiry-2" },
      members: [
        {
          notificationId: "fixture-notification-2",
          schemaVersion: 1,
          occurredAt: "2026-10-14T09:00:00.000Z",
          expiresAt: "2027-01-12T09:00:00.000Z",
          readAt: null,
          eventType: "inquiry_created",
          sourceRecord: { kind: "inquiry", id: "fixture-inquiry-2" },
          sourceOccurrence: { kind: "inquiry_audit", id: "fixture-audit-2" },
        },
      ],
    },
  ],
} satisfies NotificationsResponse
export const notificationCommandsFixture: NotificationCommands = {
  async markRead() {
    return {
      ok: true,
      value: {
        contractVersion: "clinic-notifications-v1",
        serverTime: "2026-10-14T09:01:00.000Z",
        acknowledged: true,
      },
    }
  },
  async load(query) {
    if (query.mode === "summary")
      return {
        ok: true,
        value: {
          contractVersion: "clinic-notifications-v1",
          serverTime: "2026-10-14T09:00:01.000Z",
          mode: "summary",
          unreadCount: 2,
          nextUnreadCountChangeAt: "2027-01-12T09:00:00.000Z",
        },
      }
    return { ok: true, value: { ...notificationPageFixture, view: query.view } }
  },
}
