// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { dashboardProfileTasks } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"
import {
  getStoredNotificationReadState,
  parseNotificationReadIds,
  storeNotificationReadIds,
} from "@/features/clinic-dashboard/workspace/browser-session"
import { notificationsFixture } from "@/features/clinic-dashboard/workspace/testing/workspace.fixtures"
import { useClinicDashboardController } from "@/features/clinic-dashboard/workspace/useClinicDashboardController"

const initialProfileTask = dashboardProfileTasks[0]
const alternateProfileTask = dashboardProfileTasks[1]

if (!initialProfileTask || !alternateProfileTask) {
  throw new Error("The session persistence tests require two profile task fixtures.")
}

function renderController(persistNotificationReadStateInSession: boolean) {
  return renderHook(() =>
    useClinicDashboardController({
      initialLocationId: "berlin-mitte",
      initialNotificationReadIds: [],
      initialNotificationsOpen: false,
      initialProfileTask,
      initialSection: "dashboard",
      notifications: notificationsFixture,
      persistNotificationReadStateInSession,
      prototypeMode: "presentation",
    }),
  )
}

describe("workspace session persistence", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("falls back safely when notification storage reads throw", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Session storage is blocked.", "SecurityError")
    })

    expect(getStoredNotificationReadState()).toBeUndefined()
    const { result } = renderController(true)
    expect(result.current.model.activePrototypeMode).toBe("presentation")
    expect(result.current.model.notificationReadIds).toEqual([])
  })

  it("keeps local actions functional when notification writes throw", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Session storage is blocked.", "SecurityError")
    })
    const { result } = renderController(true)

    expect(() => storeNotificationReadIds(["notification-id"])).not.toThrow()
    act(() => result.current.actions.setShowFullInterface(true))
    act(() => result.current.actions.markAllNotificationsRead())

    expect(result.current.model.activePrototypeMode).toBe("visual-reference")
    expect(result.current.model.notificationReadIds).toEqual(notificationsFixture.map(({ id }) => id))
  })

  it("persists only notification read ids and not the internal interface mode", () => {
    const { result } = renderController(true)

    act(() => result.current.actions.setShowFullInterface(true))
    act(() => result.current.actions.markAllNotificationsRead())

    expect(window.sessionStorage).toHaveLength(1)
    expect(parseNotificationReadIds(getStoredNotificationReadState())).toEqual(
      notificationsFixture.map(({ id }) => id),
    )
  })

  it("does not touch browser persistence in local story mode", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem")
    const setItem = vi.spyOn(Storage.prototype, "setItem")
    const { result } = renderController(false)

    act(() => result.current.actions.markAllNotificationsRead())
    expect(result.current.model.notificationReadIds).toEqual(notificationsFixture.map(({ id }) => id))
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })

  it("opens one notification target, marks only it read, and resets location-scoped state", () => {
    const { result } = renderController(false)
    const notification = notificationsFixture[0]
    if (!notification) throw new Error("A notification fixture is required.")

    act(() => result.current.actions.navigateToProfileTarget("gallery"))
    act(() => result.current.actions.openProfileTask(initialProfileTask))
    act(() => result.current.actions.openSupport())
    act(() => result.current.actions.openNotification(notification, "Mitte", alternateProfileTask))

    expect(result.current.model.activeSection).toBe("messages")
    expect(result.current.model.messageFocusTarget).toEqual({
      conversationId: "mitte-active-conversation",
    })
    expect(result.current.model.notificationReadIds).toEqual([notification.id])
    expect(result.current.model.profileTaskOpen).toBe(false)
    expect(result.current.model.profileFocusTarget).toBeUndefined()
    expect(result.current.model.supportOpen).toBe(false)
    expect(result.current.model.locationAnnouncement).toBe("Opened conversation at Mitte.")
  })

  it("requests heading focus for direct review navigation", () => {
    const { result } = renderController(false)

    act(() => result.current.actions.navigateToReviews())

    expect(result.current.model.activeSection).toBe("reviews")
    expect(result.current.model.reviewFocusTarget).toEqual({ kind: "heading" })
  })

  it("retains navigation while a manual location switch clears focus and dialogs", () => {
    const { result } = renderController(false)
    act(() => result.current.actions.navigate("messages"))
    act(() => result.current.actions.openProfileTask(initialProfileTask))
    act(() => result.current.actions.openSupport())
    act(() =>
      result.current.actions.selectLocation("future-location-123", "Future Clinic", alternateProfileTask),
    )

    expect(result.current.model.activeSection).toBe("messages")
    expect(result.current.model.profileTaskOpen).toBe(false)
    expect(result.current.model.messageFocusTarget).toBeUndefined()
    expect(result.current.model.reviewFocusTarget).toBeUndefined()
    expect(result.current.model.supportOpen).toBe(false)
    expect(result.current.model.locationAnnouncement).toBe("Location changed to Future Clinic.")
  })
})
