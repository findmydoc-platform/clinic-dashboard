// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { useOpenInquiryInventory } from "@/features/clinic-dashboard/dashboard/hooks/useOpenInquiryInventory"
import type { InquiryOpenInventoryCommands } from "@/features/clinic-dashboard/messages/public"

afterEach(cleanup)

it("retains the last inquiry count through a coalesced refresh, a transient failure and its retry", async () => {
  let fail!: (error: Error) => void
  let succeed!: (value: Awaited<ReturnType<InquiryOpenInventoryCommands["loadOpenInventory"]>>) => void
  const commands: InquiryOpenInventoryCommands = {
    loadOpenInventory: vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: { count: 5 } })
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            fail = reject
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            succeed = resolve
          }),
      ),
  }
  const hook = renderHook(() =>
    useOpenInquiryInventory({ scope: "principal:clinic", commands, enabled: true }),
  )
  await waitFor(() => expect(hook.result.current.state.status).toBe("ready"))
  let first!: Promise<void>
  let equivalent!: Promise<void>
  await act(async () => {
    first = hook.result.current.refresh()
    equivalent = hook.result.current.refresh()
  })
  expect(first).toBe(equivalent)
  expect(commands.loadOpenInventory).toHaveBeenCalledTimes(2)
  expect(hook.result.current.state).toEqual({ status: "ready", count: 5, refreshState: "updating" })
  await act(async () => {
    fail(new Error("Synthetic failure"))
    await first
  })
  expect(hook.result.current.state).toEqual({ status: "ready", count: 5, refreshState: "stale" })
  await act(async () => {
    first = hook.result.current.refresh()
  })
  expect(hook.result.current.state).toEqual({ status: "ready", count: 5, refreshState: "stale" })
  await act(async () => {
    succeed({ ok: true, value: { count: 0 } })
    await first
  })
  expect(hook.result.current.state).toEqual({ status: "ready", count: 0, refreshState: "idle" })
})

it.each(["unauthorized", "access-denied"] as const)(
  "clears a retained inquiry count after %s instead of exposing stale data",
  async (code) => {
    const commands: InquiryOpenInventoryCommands = {
      loadOpenInventory: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, value: { count: 5 } })
        .mockResolvedValueOnce({ ok: false, error: { code } }),
    }
    const onSessionLost = vi.fn()
    const onAccessLost = vi.fn()
    const hook = renderHook(() =>
      useOpenInquiryInventory({
        scope: "principal:clinic",
        commands,
        enabled: true,
        onSessionLost,
        onAccessLost,
      }),
    )
    await waitFor(() => expect(hook.result.current.state.status).toBe("ready"))
    await act(async () => {
      await hook.result.current.refresh()
    })
    expect(hook.result.current.state).toEqual({ status: "unavailable" })
    expect(code === "unauthorized" ? onSessionLost : onAccessLost).toHaveBeenCalledTimes(1)
  },
)

it("clears retained inquiry values on a scope change and ignores the previous pending result", async () => {
  let finishOld!: (value: Awaited<ReturnType<InquiryOpenInventoryCommands["loadOpenInventory"]>>) => void
  const commands: InquiryOpenInventoryCommands = {
    loadOpenInventory: vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: { count: 5 } })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve
          }),
      )
      .mockImplementationOnce(() => new Promise(() => undefined)),
  }
  const hook = renderHook(({ scope }) => useOpenInquiryInventory({ scope, commands, enabled: true }), {
    initialProps: { scope: "principal:clinic-a" },
  })
  await waitFor(() => expect(hook.result.current.state.status).toBe("ready"))
  let pending!: Promise<void>
  await act(async () => {
    pending = hook.result.current.refresh()
  })
  hook.rerender({ scope: "principal:clinic-b" })
  expect(hook.result.current.state).toEqual({ status: "loading" })
  await act(async () => {
    finishOld({ ok: true, value: { count: 999 } })
    await pending
  })
  expect(hook.result.current.state).toEqual({ status: "loading" })
})
