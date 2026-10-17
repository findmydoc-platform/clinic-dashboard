// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { useNotificationCenterController } from "@/features/clinic-dashboard/notifications/hooks/useNotificationCenterController"
import type {
  NotificationCommands,
  NotificationLoadState,
} from "@/features/clinic-dashboard/notifications/model/notifications"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it("waits for a distant retention deadline without a browser overflow wake loop", async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-17T09:00:00.000Z"))
  const schedule = window.setTimeout.bind(window)
  // Chromium converts a delay above its signed 32-bit range to an immediate timer.
  vi.spyOn(window, "setTimeout").mockImplementation(
    (callback, delay, ...args) =>
      schedule(callback, Number(delay) > 2_147_483_647 ? 1 : delay, ...args) as unknown as ReturnType<
        typeof window.setTimeout
      >,
  )
  const response = {
    contractVersion: "clinic-notifications-v1",
    mode: "summary",
    serverTime: "2026-10-17T09:00:00.000Z",
    unreadCount: 1,
    nextUnreadCountChangeAt: "2027-01-12T09:00:00.000Z",
  } as const
  const commands: NotificationCommands = {
    load: vi.fn(async () => ({ ok: true as const, value: response })),
    markRead: vi.fn(),
  }
  const initial: NotificationLoadState = { status: "ready", response }
  let renders = 0
  const { result } = renderHook(() => {
    renders += 1
    return useNotificationCenterController(commands, initial, false)
  })
  await act(async () => {
    await Promise.resolve()
  })
  const before = renders
  for (let elapsed = 0; elapsed < 20; elapsed += 1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
  expect(result.current.model.unreadCount).toBe(1)
  expect(commands.load).toHaveBeenCalledTimes(1)
  expect(renders - before).toBeLessThanOrEqual(1)
})
