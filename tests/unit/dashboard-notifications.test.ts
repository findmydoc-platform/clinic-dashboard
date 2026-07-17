import { describe, expect, it } from "vitest"
import {
  getUnreadNotifications,
  markAllNotificationsAsRead,
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
    expect(getUnreadNotifications(notificationsFixture, ["message-lukas-weber"]).map(({ id }) => id)).toEqual(
      ["review-response"],
    )
  })

  it("keeps existing read state and marks every fixture notification as read", () => {
    const readIds = markAllNotificationsAsRead(notificationsFixture, ["existing-id"])

    expect(readIds).toEqual(["existing-id", "message-lukas-weber", "review-response"])
    expect(getUnreadNotifications(notificationsFixture, readIds)).toHaveLength(0)
  })
})
