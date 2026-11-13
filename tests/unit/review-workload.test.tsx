// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { useReviewWorkloadController } from "@/features/clinic-dashboard/reviews/hooks/useReviewWorkloadController"
import { ReviewSourceCommandError } from "@/features/clinic-dashboard/reviews/model/review-source-commands"
import { createReviewSourceCommandsFixture } from "@/features/clinic-dashboard/reviews/testing/review-source.fixtures"
afterEach(cleanup)

it("clears the previous scope immediately and ignores a delayed review workload after switching principal", async () => {
  let resolve!: (value: { reviewsToAnswerCount: number; pendingModerationCount: number }) => void
  const oldCommands = {
    ...createReviewSourceCommandsFixture(),
    loadWorkload: vi.fn(
      () =>
        new Promise<{ reviewsToAnswerCount: number; pendingModerationCount: number }>((done) => {
          resolve = done
        }),
    ),
  }
  const newCommands = {
    ...createReviewSourceCommandsFixture(),
    loadWorkload: vi.fn(async () => ({ reviewsToAnswerCount: 0, pendingModerationCount: 1 })),
  }
  const hook = renderHook(({ scope, commands }) => useReviewWorkloadController({ scope, commands }), {
    initialProps: { scope: "principal-a:clinic", commands: oldCommands },
  })
  expect(hook.result.current.model.status).toBe("loading")
  await waitFor(() => expect(oldCommands.loadWorkload).toHaveBeenCalled())
  hook.rerender({ scope: "principal-b:clinic", commands: newCommands })
  await waitFor(() =>
    expect(hook.result.current.model).toEqual({
      status: "ready",
      refreshState: "idle",
      workload: { reviewsToAnswerCount: 0, pendingModerationCount: 1 },
    }),
  )
  await act(async () => resolve({ reviewsToAnswerCount: 999, pendingModerationCount: 999 }))
  expect(hook.result.current.model).toEqual({
    status: "ready",
    refreshState: "idle",
    workload: { reviewsToAnswerCount: 0, pendingModerationCount: 1 },
  })
})

it("shows unavailable after failure and replaces it only after an independent manual retry", async () => {
  const loadWorkload = vi
    .fn()
    .mockRejectedValueOnce(new Error("Synthetic source failure"))
    .mockResolvedValueOnce({ reviewsToAnswerCount: 0, pendingModerationCount: 2 })
  const commands = { ...createReviewSourceCommandsFixture(), loadWorkload }
  const hook = renderHook(() => useReviewWorkloadController({ scope: "principal:clinic", commands }))
  await waitFor(() => expect(hook.result.current.model.status).toBe("unavailable"))
  await act(async () => {
    await hook.result.current.actions.retry()
  })
  expect(hook.result.current.model).toEqual({
    status: "ready",
    refreshState: "idle",
    workload: { reviewsToAnswerCount: 0, pendingModerationCount: 2 },
  })
})

it("retains a complete snapshot during refresh, failure and retry, then replaces both review counts together", async () => {
  let resolveRefresh!: (value: { reviewsToAnswerCount: number; pendingModerationCount: number }) => void
  let rejectRefresh!: (error: Error) => void
  const loadWorkload = vi
    .fn()
    .mockResolvedValueOnce({ reviewsToAnswerCount: 4, pendingModerationCount: 2 })
    .mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectRefresh = reject
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve
        }),
    )
  const commands = { ...createReviewSourceCommandsFixture(), loadWorkload }
  const hook = renderHook(() => useReviewWorkloadController({ scope: "principal:clinic", commands }))
  await waitFor(() => expect(hook.result.current.model.status).toBe("ready"))
  let pending!: Promise<void>
  await act(async () => {
    pending = hook.result.current.actions.retry()
  })
  expect(hook.result.current.model).toMatchObject({
    status: "ready",
    refreshState: "updating",
    workload: { reviewsToAnswerCount: 4, pendingModerationCount: 2 },
  })
  await act(async () => {
    rejectRefresh(new Error("Synthetic refresh failure"))
    await pending
  })
  expect(hook.result.current.model).toMatchObject({
    status: "ready",
    refreshState: "stale",
    workload: { reviewsToAnswerCount: 4, pendingModerationCount: 2 },
  })
  await act(async () => {
    pending = hook.result.current.actions.retry()
  })
  expect(hook.result.current.model).toMatchObject({
    status: "ready",
    refreshState: "stale",
    workload: { reviewsToAnswerCount: 4, pendingModerationCount: 2 },
  })
  await act(async () => {
    resolveRefresh({ reviewsToAnswerCount: 0, pendingModerationCount: 1 })
    await pending
  })
  expect(hook.result.current.model).toEqual({
    status: "ready",
    refreshState: "idle",
    workload: { reviewsToAnswerCount: 0, pendingModerationCount: 1 },
  })
})

it.each(["unauthorized", "forbidden"] as const)(
  "clears a retained review snapshot after %s",
  async (kind) => {
    const loadWorkload = vi
      .fn()
      .mockResolvedValueOnce({ reviewsToAnswerCount: 4, pendingModerationCount: 2 })
      .mockRejectedValueOnce(new ReviewSourceCommandError(kind, "Synthetic access failure"))
    const commands = { ...createReviewSourceCommandsFixture(), loadWorkload }
    const onAccessFailure = vi.fn()
    const hook = renderHook(() =>
      useReviewWorkloadController({ scope: "principal:clinic", commands, onAccessFailure }),
    )
    await waitFor(() => expect(hook.result.current.model.status).toBe("ready"))
    await act(async () => {
      await hook.result.current.actions.retry()
    })
    expect(hook.result.current.model).toEqual({ status: "unavailable" })
    expect(onAccessFailure).toHaveBeenCalledWith(kind)
  },
)
