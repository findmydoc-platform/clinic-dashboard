import { describe, expect, it } from "vitest"
import {
  assertClinicDashboardNotificationTargets,
  getUnreadNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/features/clinic-dashboard/workspace/model/notifications"
import { notificationsFixture } from "@/features/clinic-dashboard/workspace/testing/workspace.fixtures"

describe("dashboard notification fixtures", () => {
  it("sorts unread notifications from newest to oldest", () => {
    const reversedNotifications = [...notificationsFixture].reverse()

    expect(getUnreadNotifications(reversedNotifications, []).map(({ id }) => id)).toEqual([
      "message-lukas-weber",
      "review-response",
    ])
    expect(notificationsFixture.map(({ type }) => type)).toEqual(["message", "review"])
  })

  it("excludes only the notification that was individually read", () => {
    const readIds = markNotificationAsRead("message-lukas-weber", [])
    expect(readIds).toEqual(["message-lukas-weber"])
    expect(markNotificationAsRead("message-lukas-weber", readIds)).toBe(readIds)
    expect(getUnreadNotifications(notificationsFixture, readIds).map(({ id }) => id)).toEqual([
      "review-response",
    ])
  })

  it("keeps existing read state and marks every fixture notification as read", () => {
    const readIds = markAllNotificationsAsRead(notificationsFixture, ["existing-id"])

    expect(readIds).toEqual(["existing-id", "message-lukas-weber", "review-response"])
    expect(getUnreadNotifications(notificationsFixture, readIds)).toHaveLength(0)
  })

  it("rejects unknown location, conversation, and review notification targets", () => {
    const targetIndex = {
      "berlin-charlottenburg": {
        conversationIds: [],
        reviewIds: ["charlottenburg-review-markus-schmidt"],
      },
      "berlin-mitte": { conversationIds: ["mitte-active-conversation"], reviewIds: [] },
    }
    expect(() => assertClinicDashboardNotificationTargets(notificationsFixture, targetIndex)).not.toThrow()
    expect(() =>
      assertClinicDashboardNotificationTargets(
        [{ ...notificationsFixture[0]!, locationId: "unknown" }],
        targetIndex,
      ),
    ).toThrow(/unknown location/)
    expect(() =>
      assertClinicDashboardNotificationTargets(
        [
          {
            ...notificationsFixture[0]!,
            target: { conversationId: "unknown", kind: "conversation" },
          },
        ],
        targetIndex,
      ),
    ).toThrow(/unknown conversation/)
    expect(() =>
      assertClinicDashboardNotificationTargets(
        [
          {
            ...notificationsFixture[1]!,
            target: { kind: "review", reviewId: "unknown" },
          },
        ],
        targetIndex,
      ),
    ).toThrow(/unknown review/)
  })
})
