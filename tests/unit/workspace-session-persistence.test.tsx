// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { dashboardProfileTasks } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"
import { useClinicDashboardController } from "@/features/clinic-dashboard/workspace/useClinicDashboardController"

const initialProfileTask = dashboardProfileTasks[0]

if (!initialProfileTask) {
  throw new Error("The session persistence tests require a profile task fixture.")
}

function renderController(options: Readonly<{ omitProfileTask?: boolean }> = {}) {
  return renderHook(() =>
    useClinicDashboardController({
      initialLocationId: "berlin-mitte",
      initialNotificationsOpen: false,
      initialProfileTask: options.omitProfileTask ? undefined : initialProfileTask,
      initialSection: "dashboard",
      prototypeMode: "presentation",
    }),
  )
}

describe("workspace navigation and profile task state", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("supports a complete public profile without a selected task", () => {
    const { result } = renderController({ omitProfileTask: true })

    expect(result.current.model.selectedProfileTask).toBeUndefined()
    expect(result.current.model.profileTaskOpen).toBe(false)

    act(() => result.current.actions.selectLocation("future-location-123", "Future Clinic"))

    expect(result.current.model.selectedProfileTask).toBeUndefined()
    expect(result.current.model.profileTaskOpen).toBe(false)
    expect(result.current.model.locationAnnouncement).toBe("Location changed to Future Clinic.")
  })

  it("closes a stale task when the next server read completes the profile", () => {
    const { result, rerender } = renderHook(
      ({ profileTask }: Readonly<{ profileTask?: typeof initialProfileTask }>) =>
        useClinicDashboardController({
          initialLocationId: "berlin-mitte",
          initialNotificationsOpen: false,
          initialProfileTask: profileTask,
          initialSection: "dashboard",
          prototypeMode: "presentation",
        }),
      {
        initialProps: {
          profileTask: initialProfileTask as typeof initialProfileTask | undefined,
        },
      },
    )

    act(() => result.current.actions.openProfileTask(initialProfileTask))
    expect(result.current.model.profileTaskOpen).toBe(true)

    rerender({ profileTask: undefined })

    expect(result.current.model.selectedProfileTask).toBeUndefined()
    expect(result.current.model.profileTaskOpen).toBe(false)
  })

  it("requests heading focus for direct review navigation", () => {
    const { result } = renderController()

    act(() => result.current.actions.navigateToReviews())

    expect(result.current.model.activeSection).toBe("reviews")
    expect(result.current.model.reviewFocusTarget).toEqual({ kind: "heading" })
  })

  it("retains navigation while a manual location switch clears focus and dialogs", () => {
    const { result } = renderController()
    act(() => result.current.actions.navigate("messages"))
    act(() => result.current.actions.openProfileTask(initialProfileTask))
    act(() => result.current.actions.openSupport())
    act(() => result.current.actions.selectLocation("future-location-123", "Future Clinic"))

    expect(result.current.model.activeSection).toBe("messages")
    expect(result.current.model.profileTaskOpen).toBe(false)
    expect(result.current.model.messageFocusTarget).toBeUndefined()
    expect(result.current.model.reviewFocusTarget).toBeUndefined()
    expect(result.current.model.supportOpen).toBe(false)
    expect(result.current.model.locationAnnouncement).toBe("Location changed to Future Clinic.")
  })
})
