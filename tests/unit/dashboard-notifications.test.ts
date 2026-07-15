import { describe, expect, it } from "vitest"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import { getUnreadNotifications, markAllNotificationsAsRead } from "@/lib/clinic-dashboard/notifications"

describe("dashboard notification fixtures", () => {
  it("sorts unread notifications from newest to oldest", () => {
    const reversedNotifications = [...clinicDashboardFixture.notifications].reverse()

    expect(getUnreadNotifications(reversedNotifications, []).map(({ id }) => id)).toEqual([
      "message-lukas-weber",
      "review-response",
    ])
    expect(clinicDashboardFixture.notifications.map(({ type }) => type)).toEqual(["message", "review"])
  })

  it("excludes only the notification that was individually read", () => {
    expect(
      getUnreadNotifications(clinicDashboardFixture.notifications, ["message-lukas-weber"]).map(
        ({ id }) => id,
      ),
    ).toEqual(["review-response"])
  })

  it("keeps existing read state and marks every fixture notification as read", () => {
    const readIds = markAllNotificationsAsRead(clinicDashboardFixture.notifications, ["existing-id"])

    expect(readIds).toEqual(["existing-id", "message-lukas-weber", "review-response"])
    expect(getUnreadNotifications(clinicDashboardFixture.notifications, readIds)).toHaveLength(0)
  })
})
