// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { dashboardProfileTasks } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"
import {
  getStoredNotificationReadState,
  getStoredPrototypeMode,
  storeNotificationReadIds,
  storePrototypeMode,
} from "@/features/clinic-dashboard/workspace/browser-session"
import { notificationsFixture } from "@/features/clinic-dashboard/workspace/testing/workspace.fixtures"
import { useClinicDashboardController } from "@/features/clinic-dashboard/workspace/useClinicDashboardController"

const initialProfileTask = dashboardProfileTasks[0]
const alternateProfileTask = dashboardProfileTasks[1]

if (!initialProfileTask || !alternateProfileTask) {
  throw new Error("The session persistence tests require two profile task fixtures.")
}

function renderController(persistWorkspaceStateInSession: boolean) {
  return renderHook(() =>
    useClinicDashboardController({
      initialNotificationReadIds: [],
      initialNotificationsOpen: false,
      initialPatientInquiryOpen: false,
      initialLocationId: "berlin-mitte",
      initialProfileTask,
      initialSection: "dashboard",
      notifications: notificationsFixture,
      persistWorkspaceStateInSession,
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

  it("falls back safely when session storage reads throw a SecurityError", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Session storage is blocked.", "SecurityError")
    })

    expect(getStoredPrototypeMode()).toBeUndefined()
    expect(getStoredNotificationReadState()).toBeUndefined()

    const { result } = renderController(true)

    expect(result.current.model.activePrototypeMode).toBe("presentation")
    expect(result.current.model.notificationReadIds).toEqual([])
  })

  it("keeps actions functional when session storage writes throw a SecurityError", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Session storage is blocked.", "SecurityError")
    })

    const { result } = renderController(true)

    expect(() => storePrototypeMode("visual-reference")).not.toThrow()
    expect(() => storeNotificationReadIds(["notification-id"])).not.toThrow()
    window.sessionStorage.clear()

    act(() => result.current.actions.setShowFullInterface(true))
    act(() => result.current.actions.markAllNotificationsRead())

    expect(result.current.model.activePrototypeMode).toBe("visual-reference")
    expect(result.current.model.notificationReadIds).toEqual(notificationsFixture.map(({ id }) => id))
  })

  it("does not touch browser persistence or subscribe in local mode", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem")
    const setItem = vi.spyOn(Storage.prototype, "setItem")
    const addEventListener = vi.spyOn(window, "addEventListener")
    const dispatchEvent = vi.spyOn(window, "dispatchEvent")

    const { result } = renderController(false)

    act(() => result.current.actions.setShowFullInterface(true))
    act(() => result.current.actions.markAllNotificationsRead())

    expect(result.current.model.activePrototypeMode).toBe("visual-reference")
    expect(result.current.model.notificationReadIds).toEqual(notificationsFixture.map(({ id }) => id))
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    expect(
      addEventListener.mock.calls.some(
        ([eventName]) => eventName === "storage" || String(eventName).startsWith("clinic-dashboard-"),
      ),
    ).toBe(false)
    expect(dispatchEvent.mock.calls.some(({ 0: event }) => event.type.startsWith("clinic-dashboard-"))).toBe(
      false,
    )
  })

  it("retains navigation but clears location-scoped dialogs and focus state", () => {
    const { result } = renderController(false)

    act(() => result.current.actions.navigateToProfileTarget("gallery"))
    act(() => result.current.actions.navigateToReviews())
    act(() => result.current.actions.navigate("messages"))
    act(() => result.current.actions.openPatientInquiry())
    act(() => result.current.actions.openProfileTask(initialProfileTask))
    act(() => result.current.actions.openSupport())
    act(() =>
      result.current.actions.selectLocation("future-location-123", "Future Clinic", alternateProfileTask),
    )

    expect(result.current.model.activeSection).toBe("messages")
    expect(result.current.model.patientInquiryOpen).toBe(false)
    expect(result.current.model.profileTaskOpen).toBe(false)
    expect(result.current.model.profileFocusTarget).toBeUndefined()
    expect(result.current.model.reviewsFocusRequested).toBe(false)
    expect(result.current.model.supportOpen).toBe(false)
    expect(result.current.model.selectedProfileTask).toBe(alternateProfileTask)
    expect(result.current.model.locationAnnouncement).toBe("Location changed to Future Clinic.")
  })
})
