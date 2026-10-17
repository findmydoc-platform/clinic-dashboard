// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useNotificationCenterController } from "@/features/clinic-dashboard/notifications/hooks/useNotificationCenterController"
import type {
  NotificationCommands,
  NotificationLoadState,
} from "@/features/clinic-dashboard/notifications/model/notifications"

import {
  notificationPageFixture,
  notificationCommandsFixture,
} from "@/features/clinic-dashboard/notifications/testing/public"

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

describe("personal notification navigation ownership", () => {
  it("invalidates an old receipt response on an ordinary clinic switch", async () => {
    let finish!: (value: Awaited<ReturnType<NotificationCommands["markRead"]>>) => void
    const api: NotificationCommands = {
      ...notificationCommandsFixture,
      markRead: vi.fn(
        () =>
          new Promise<Awaited<ReturnType<NotificationCommands["markRead"]>>>((resolve) => {
            finish = resolve
          }),
      ),
    }
    const { result, rerender } = renderHook(
      ({ clinicId }) =>
        useNotificationCenterController(
          api,
          { status: "ready", response: notificationPageFixture },
          false,
          undefined,
          { principalId: "person-1", clinicId },
        ),
      { initialProps: { clinicId: "clinic-1" } },
    )
    let pending!: Promise<void>
    act(() => {
      pending = result.current.actions.markRead(["old-selection"])
    })
    rerender({ clinicId: "clinic-2" })
    await act(async () => {
      finish({ ok: false, error: "SERVICE_UNAVAILABLE", writeOutcome: "unknown" })
      await pending
    })
    expect(result.current.model.marking.status).toBe("idle")
    expect(result.current.model.unreadCount).toBeUndefined()
  })

  it("retains only the intentional target selection across its clinic transition", async () => {
    let displayed!: (value: "displayed" | "cancelled") => void
    const open = vi.fn(
      () =>
        new Promise<"displayed" | "cancelled">((resolve) => {
          displayed = resolve
        }),
    )
    const markRead = vi.fn(notificationCommandsFixture.markRead)
    const api = { ...notificationCommandsFixture, markRead }
    const { result, rerender } = renderHook(
      ({ clinicId }) =>
        useNotificationCenterController(
          api,
          { status: "ready", response: notificationPageFixture },
          false,
          open,
          { principalId: "person-1", clinicId },
        ),
      { initialProps: { clinicId: "clinic-1" } },
    )
    let pending!: Promise<void>
    act(() => {
      pending = result.current.actions.openItem!(notificationPageFixture.items[1]!)
    })
    rerender({ clinicId: "clinic-2" })
    expect(markRead).not.toHaveBeenCalled()
    await act(async () => {
      displayed("displayed")
      await pending
    })
    expect(markRead).toHaveBeenCalledExactlyOnceWith({ notificationIds: ["fixture-notification-2"] })
  })

  it.each(["another-clinic", "another-person"])(
    "rejects a late display after %s supersedes its owner",
    async (change) => {
      let displayed!: (value: "displayed") => void
      const open = vi.fn(
        () =>
          new Promise<"displayed">((resolve) => {
            displayed = resolve
          }),
      )
      const markRead = vi.fn(notificationCommandsFixture.markRead)
      const api = { ...notificationCommandsFixture, markRead }
      const { result, rerender } = renderHook(
        (context) =>
          useNotificationCenterController(
            api,
            { status: "ready", response: notificationPageFixture },
            false,
            open,
            context,
          ),
        { initialProps: { principalId: "person-1", clinicId: "clinic-1" } },
      )
      let pending!: Promise<void>
      act(() => {
        pending = result.current.actions.openItem!(notificationPageFixture.items[1]!)
      })
      rerender(
        change === "another-clinic"
          ? { principalId: "person-1", clinicId: "clinic-3" }
          : { principalId: "person-2", clinicId: "clinic-2" },
      )
      await act(async () => {
        displayed("displayed")
        await pending
      })
      expect(markRead).not.toHaveBeenCalled()
      expect(result.current.model.opening).toBe("cancelled")
    },
  )
})
