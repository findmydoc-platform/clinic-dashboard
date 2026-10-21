// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useNotificationCenterController } from "@/features/clinic-dashboard/notifications/hooks/useNotificationCenterController"
import type {
  NotificationCommands,
  NotificationLoadState,
  NotificationsResponse,
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
  it("finishes the current feed when its selected view is clicked during a clinic refresh", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
    let finish: ((value: Awaited<ReturnType<NotificationCommands["load"]>>) => void) | undefined
    let defer = false
    const load = vi.fn<NotificationCommands["load"]>((query) => {
      if (defer) {
        return new Promise((resolve) => {
          finish = resolve
        })
      }
      return notificationCommandsFixture.load(query)
    })
    const api = { ...notificationCommandsFixture, load }
    const { result, rerender } = renderHook(
      ({ clinicId }) =>
        useNotificationCenterController(api, { status: "loading" }, true, undefined, {
          principalId: "person-1",
          clinicId,
        }),
      { initialProps: { clinicId: "clinic-1" } },
    )
    await act(async () => {})
    act(() => result.current.actions.selectView("all"))
    await act(async () => {})
    expect(result.current.model.view).toBe("all")

    defer = true
    load.mockClear()
    rerender({ clinicId: "clinic-2" })
    await act(async () => {})
    expect(result.current.model.state.status).toBe("loading")
    act(() => result.current.actions.selectView("all"))
    await act(async () => {
      finish!({ ok: true, value: { ...notificationPageFixture, view: "all" } })
    })

    expect(result.current.model.state).toMatchObject({
      status: "ready",
      response: { view: "all", items: expect.arrayContaining(notificationPageFixture.items) },
    })
    expect(result.current.model.refreshState).toBe("idle")
    expect(load).toHaveBeenCalledTimes(1)
    defer = false
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it("reloads the personal loaded extent with fresh cursors after a clinic switch", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
    const first = notificationPageFixture.items[0]!
    const older = {
      ...notificationPageFixture.items[1]!,
      members: notificationPageFixture.items[1]!.members.map((member) => ({
        ...member,
        occurredAt: "2026-10-13T09:00:00.000Z",
      })),
    }
    let revision = "before"
    const load = vi.fn<NotificationCommands["load"]>(async (query) => {
      const value: NotificationsResponse =
        query.mode === "summary"
          ? {
              contractVersion: "clinic-notifications-v1",
              mode: "summary",
              serverTime: notificationPageFixture.serverTime,
              unreadCount: 2,
              nextUnreadCountChangeAt: "2027-01-12T09:00:00.000Z",
            }
          : query.cursor
            ? {
                contractVersion: "clinic-notifications-v1",
                mode: "page",
                view: query.view,
                serverTime: notificationPageFixture.serverTime,
                items: [older],
                nextCursor: null,
              }
            : {
                ...notificationPageFixture,
                view: query.view,
                items: [first],
                nextCursor: `${revision}-cursor`,
              }
      return { ok: true, value }
    })
    const api = { ...notificationCommandsFixture, load }
    const { result, rerender } = renderHook(
      ({ clinicId, open }) =>
        useNotificationCenterController(api, { status: "loading" }, open, undefined, {
          principalId: "person-1",
          clinicId,
        }),
      { initialProps: { clinicId: "clinic-1", open: true } },
    )
    await act(async () => {})
    await act(async () => result.current.actions.loadMore())
    expect(result.current.model.state).toMatchObject({
      status: "ready",
      response: { items: [first, older] },
    })
    rerender({ clinicId: "clinic-1", open: false })
    await act(async () => {})
    revision = "after"
    load.mockClear()
    rerender({ clinicId: "clinic-2", open: false })
    await act(async () => {})
    expect(result.current.model.state.status).toBe("loading")
    rerender({ clinicId: "clinic-2", open: true })
    await act(async () => {})
    expect(result.current.model.state).toMatchObject({
      status: "ready",
      response: { items: [first, older] },
    })
    expect(load.mock.calls.map(([query]) => query)).toEqual([
      { mode: "summary" },
      { mode: "page", view: "unread" },
      { mode: "page", view: "unread", cursor: "after-cursor" },
    ])
  })

  it.each(["principal", "disabled", "access-loss"] as const)(
    "discards the personal loaded extent after %s changes",
    async (change) => {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
      const first = notificationPageFixture.items[0]!
      const older = {
        ...notificationPageFixture.items[1]!,
        members: notificationPageFixture.items[1]!.members.map((member) => ({
          ...member,
          occurredAt: "2026-10-13T09:00:00.000Z",
        })),
      }
      let denied = false
      const load = vi.fn<NotificationCommands["load"]>(async (query) => {
        if (denied) return { ok: false, error: "CLINIC_ACCESS_DENIED" }
        if (query.mode === "summary") return notificationCommandsFixture.load(query)
        if (query.cursor)
          return {
            ok: true,
            value: {
              contractVersion: "clinic-notifications-v1",
              mode: "page",
              view: query.view,
              serverTime: notificationPageFixture.serverTime,
              items: [older],
              nextCursor: null,
            },
          }
        return {
          ok: true,
          value: { ...notificationPageFixture, view: query.view, items: [first], nextCursor: "cursor" },
        }
      })
      const api = { ...notificationCommandsFixture, load }
      const context = { principalId: "person-1", clinicId: "clinic-1", enabled: true }
      const { result, rerender } = renderHook(
        (context) => useNotificationCenterController(api, { status: "loading" }, true, undefined, context),
        { initialProps: context },
      )
      await act(async () => {})
      await act(async () => result.current.actions.loadMore())
      expect(result.current.model.state).toMatchObject({ response: { items: [first, older] } })
      // Store the personal extent while clearing the old clinic's data and actions.
      rerender({ ...context, clinicId: "clinic-2" })
      await act(async () => {})
      if (change === "access-loss") {
        denied = true
        act(() => result.current.actions.retry())
        await act(async () => {})
        expect(result.current.model.state.status).toBe("unavailable")
        denied = false
      }
      if (change === "disabled") rerender({ ...context, clinicId: "clinic-2", enabled: false })
      load.mockClear()
      rerender({
        ...context,
        clinicId: "clinic-3",
        principalId: change === "principal" ? "person-2" : "person-1",
      })
      await act(async () => {})
      expect(result.current.model.state).toMatchObject({ response: { items: [first] } })
      expect(load).toHaveBeenCalledExactlyOnceWith({ mode: "page", view: "unread" }, expect.any(AbortSignal))
    },
  )

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
