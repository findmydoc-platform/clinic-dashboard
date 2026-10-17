import "server-only"
import type { NotificationItem } from "../model/notifications"
import {
  CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
  NOTIFICATION_RETENTION_MS,
} from "../model/notification-schema"
import type { NotificationProvider } from "./notification-provider"

const createdAt = Date.now() - 60_000
const items: NotificationItem[] = Array.from({ length: 32 }, (_, index) => {
  const occurredAt = new Date(createdAt - index * 1000).toISOString()
  const expiresAt = new Date(Date.parse(occurredAt) + NOTIFICATION_RETENTION_MS).toISOString()
  return {
    kind: "occurrence",
    clinic:
      index < 8 && index % 2 === 0
        ? { id: "controlled-clinic", name: "Controlled Clinic" }
        : { id: "controlled-second-clinic", name: "Second Controlled Clinic" },
    presentationId: `controlled-notification-${index}`,
    display: {
      eventLabel: "New inquiry",
      displayName: ["Ada Patient", "Jamie Carter", "Taylor Smith", "Alex Morgan"][
        index < 8 ? Math.floor(index / 2) : index % 4
      ],
    },
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
  }
})
const receipts = new Map<string, Map<string, string>>()
export function resetControlledNotificationProvider() {
  receipts.clear()
}
export function createControlledNotificationProvider(
  accessToken = "controlled",
  principalId = "controlled-person",
  clinicIds: readonly string[] = ["controlled-clinic"],
): NotificationProvider {
  if (!accessToken.trim() || !principalId.trim()) throw new Error("Verified personal session required")
  const personal = receipts.get(principalId) ?? new Map<string, string>()
  receipts.set(principalId, personal)
  const eligible = new Set(clinicIds)
  return {
    async markRead(input) {
      if (!eligible.size) return { ok: false, error: "CLINIC_ACCESS_DENIED", writeOutcome: "not_committed" }
      const now = new Date().toISOString()
      for (const item of items)
        for (const member of item.members)
          if (
            eligible.has(item.clinic.id) &&
            input.notificationIds.includes(member.notificationId) &&
            Date.parse(member.expiresAt) > Date.now() &&
            !personal.has(member.notificationId)
          )
            personal.set(member.notificationId, now)
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
      let after = -1
      if (query.mode === "page" && query.cursor) {
        try {
          const cursor: unknown = JSON.parse(Buffer.from(query.cursor, "base64url").toString())
          if (
            !cursor ||
            typeof cursor !== "object" ||
            Object.keys(cursor).length !== 3 ||
            !("principalId" in cursor) ||
            cursor.principalId !== principalId ||
            !("view" in cursor) ||
            cursor.view !== query.view ||
            !("after" in cursor) ||
            typeof cursor.after !== "number" ||
            !Number.isInteger(cursor.after) ||
            cursor.after < 0 ||
            cursor.after >= items.length
          )
            return { ok: false, error: "CURSOR_INVALID" }
          after = cursor.after
        } catch {
          return { ok: false, error: "CURSOR_INVALID" }
        }
      }
      const visible = items
        .filter((item) => eligible.has(item.clinic.id) && Date.parse(item.members[0]!.expiresAt) > Date.now())
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
      } as const
      const count = {
        unreadCount: unread.length,
        nextUnreadCountChangeAt: unread.length ? unread.at(-1)!.members[0]!.expiresAt : null,
      }
      if (query.mode === "summary") return { ok: true, value: { ...envelope, ...count, mode: "summary" } }
      const selected = (query.view === "unread" ? unread : visible).filter(
        (item) => items.findIndex((candidate) => candidate.presentationId === item.presentationId) > after,
      )
      const page = selected.slice(0, 25)
      const tail = page.at(-1)
      const nextCursor =
        selected.length > 25 && tail
          ? Buffer.from(
              JSON.stringify({
                principalId,
                view: query.view,
                after: items.findIndex((item) => item.presentationId === tail.presentationId),
              }),
            ).toString("base64url")
          : null
      return {
        ok: true,
        value: {
          ...envelope,
          ...(query.cursor ? {} : count),
          mode: "page",
          view: query.view,
          items: page,
          nextCursor,
        },
      }
    },
  }
}
