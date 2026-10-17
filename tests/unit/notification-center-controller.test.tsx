// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useNotificationCenterController } from "@/features/clinic-dashboard/notifications/hooks/useNotificationCenterController"
import type {
  NotificationCommands,
  NotificationLoadState,
} from "@/features/clinic-dashboard/notifications/model/notifications"

const commands: NotificationCommands = { load: vi.fn(), markRead: vi.fn() }

function summary(nextUnreadCountChangeAt: string): NotificationLoadState {
  return {
    status: "ready",
    response: {
      contractVersion: "clinic-notifications-v1",
      mode: "summary",
      serverTime: "2026-10-14T09:00:00.000Z",
      unreadCount: 1,
      nextUnreadCountChangeAt,
    },
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime("2026-10-14T09:00:00.000Z")
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("notification count expiry scheduling", () => {
  it("keeps distant deadlines within the browser timer limit without immediate wakeups", async () => {
    const schedule = vi.spyOn(window, "setTimeout")
    const { result } = renderHook(() =>
      useNotificationCenterController(commands, summary("2027-01-12T09:00:00.000Z"), false),
    )

    expect(schedule).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 2_147_483_647)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(schedule).toHaveBeenCalledTimes(1)
    expect(result.current.model.unreadCount).toBe(1)
  })

  it("hides the count at a nearby deadline while offline", async () => {
    const { result } = renderHook(() =>
      useNotificationCenterController(commands, summary("2026-10-14T09:00:01.000Z"), false),
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(999)
    })
    expect(result.current.model.unreadCount).toBe(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(result.current.model.unreadCount).toBeUndefined()
  })
})
