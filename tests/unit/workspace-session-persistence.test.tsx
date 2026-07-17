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

if (!initialProfileTask) throw new Error("The session persistence tests require a profile task fixture.")

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

    act(() => result.current.actions.setShowFullInterface(true))
    act(() => result.current.actions.markAllNotificationsRead())
    act(() => result.current.actions.selectLocation("berlin-charlottenburg"))

    expect(result.current.model.activePrototypeMode).toBe("visual-reference")
    expect(result.current.model.notificationReadIds).toEqual(notificationsFixture.map(({ id }) => id))
    expect(result.current.model.selectedLocationId).toBe("berlin-charlottenburg")
  })

  it("does not touch browser persistence or subscribe in local mode", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem")
    const setItem = vi.spyOn(Storage.prototype, "setItem")
    const addEventListener = vi.spyOn(window, "addEventListener")
    const dispatchEvent = vi.spyOn(window, "dispatchEvent")

    const { result } = renderController(false)

    act(() => result.current.actions.setShowFullInterface(true))
    act(() => result.current.actions.markAllNotificationsRead())
    act(() => result.current.actions.selectLocation("berlin-charlottenburg"))

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

  it("restores the default location when the workspace controller is recreated", () => {
    const firstRender = renderController(true)

    act(() => firstRender.result.current.actions.selectLocation("berlin-charlottenburg"))
    expect(firstRender.result.current.model.selectedLocationId).toBe("berlin-charlottenburg")
    firstRender.unmount()

    const reloadedRender = renderController(true)

    expect(reloadedRender.result.current.model.selectedLocationId).toBe("berlin-mitte")
  })
})
