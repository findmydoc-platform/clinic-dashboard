// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { useReviewWorkloadController } from "@/features/clinic-dashboard/reviews/hooks/useReviewWorkloadController"
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
  hook.rerender({ scope: "principal-b:clinic", commands: newCommands })
  await waitFor(() =>
    expect(hook.result.current.model).toEqual({
      status: "ready",
      workload: { reviewsToAnswerCount: 0, pendingModerationCount: 1 },
    }),
  )
  await act(async () => resolve({ reviewsToAnswerCount: 999, pendingModerationCount: 999 }))
  expect(hook.result.current.model).toEqual({
    status: "ready",
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
    workload: { reviewsToAnswerCount: 0, pendingModerationCount: 2 },
  })
})
