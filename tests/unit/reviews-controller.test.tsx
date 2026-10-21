// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useReviewsController } from "@/features/clinic-dashboard/reviews/hooks/useReviewsController"
import { ReviewSourceCommandError } from "@/features/clinic-dashboard/reviews/model/review-source-commands"
import type {
  ReviewHistorySnapshot,
  ReviewsSourceSnapshot,
} from "@/features/clinic-dashboard/reviews/model/review-source"
import {
  createReviewSourceCommandsFixture,
  reviewHistoryFixture,
  reviewSourceRecordsFixture,
  reviewSourceSnapshotFixture,
} from "@/features/clinic-dashboard/reviews/testing/review-source.fixtures"

afterEach(cleanup)

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

describe("reviews source controller", () => {
  it("starts from the server-provided source snapshot", () => {
    const hook = renderHook(() =>
      useReviewsController({
        commands: createReviewSourceCommandsFixture(),
        showManagement: true,
        snapshot: reviewSourceSnapshotFixture,
      }),
    )
    expect(hook.result.current.model.list?.items).toHaveLength(3)
    expect(hook.result.current.model.summary?.rating).toBe(4.7)
  })

  it.each(["unauthorized", "forbidden"] as const)(
    "clears retained list and editor state when a fresh read is %s",
    async (kind) => {
      const commands = {
        ...createReviewSourceCommandsFixture(),
        loadReviews: vi.fn(async () => {
          throw new ReviewSourceCommandError(kind, "Current access lost")
        }),
      }
      const lost = vi.fn()
      const hook = renderHook(() =>
        useReviewsController({
          commands,
          onSessionLost: lost,
          showManagement: true,
          snapshot: reviewSourceSnapshotFixture,
        }),
      )
      act(() => hook.result.current.actions.openReviewResponse(reviewSourceRecordsFixture[0].id))
      act(() => hook.result.current.actions.refreshReviews())
      await waitFor(() => expect(hook.result.current.model.list).toBeUndefined())
      expect(hook.result.current.model.summary).toBeUndefined()
      expect(hook.result.current.model.dialog.kind).toBe("closed")
      expect(lost).toHaveBeenCalledTimes(1)
    },
  )

  it("applies server-backed filters", async () => {
    const hook = renderHook(() =>
      useReviewsController({
        commands: createReviewSourceCommandsFixture(),
        showManagement: true,
        snapshot: reviewSourceSnapshotFixture,
      }),
    )
    act(() => {
      hook.result.current.actions.changeDraftFilters({
        period: "all",
        rating: "all",
        treatment: "all",
        visibility: "removed",
      })
    })
    await waitFor(() => expect(hook.result.current.model.filters.isDirty).toBe(true))
    act(() => hook.result.current.actions.applyFilters())
    await waitFor(() => expect(hook.result.current.model.list?.items).toHaveLength(1))
    expect(hook.result.current.model.list?.items[0]?.publicMeasure).toBe("removed")
  })

  it("projects a submitted response independently from the review", async () => {
    const hook = renderHook(() =>
      useReviewsController({
        commands: createReviewSourceCommandsFixture(),
        showManagement: true,
        snapshot: reviewSourceSnapshotFixture,
      }),
    )
    const reviewId = reviewSourceRecordsFixture[2].id
    act(() => hook.result.current.actions.openReviewResponse(reviewId))
    await act(async () => {
      await hook.result.current.actions.submitReviewResponse(
        "Thank you for sharing this detailed feedback with our clinic.",
      )
    })
    expect(hook.result.current.model.list?.items.find(({ id }) => id === reviewId)?.response?.status).toBe(
      "pending",
    )
    expect(hook.result.current.model.statusMessage).toBe("Response submitted for moderation.")
  })

  it("loads safe history without exposing mutation actions", async () => {
    const hook = renderHook(() =>
      useReviewsController({
        commands: createReviewSourceCommandsFixture(),
        showManagement: true,
        snapshot: reviewSourceSnapshotFixture,
      }),
    )
    act(() => hook.result.current.actions.openReviewHistory(reviewSourceRecordsFixture[0].id))
    await waitFor(() => expect(hook.result.current.model.dialog.kind).toBe("history"))
    await waitFor(() => {
      if (hook.result.current.model.dialog.kind !== "history") throw new Error("History dialog missing")
      expect(hook.result.current.model.dialog.history?.publication.entries).toHaveLength(1)
    })
    expect(hook.result.current.actions).not.toHaveProperty("markReviewAppealUnderReview")
  })

  it("does not open a response dialog for a decided response", () => {
    const hook = renderHook(() =>
      useReviewsController({
        commands: createReviewSourceCommandsFixture(),
        showManagement: true,
        snapshot: reviewSourceSnapshotFixture,
      }),
    )

    act(() => hook.result.current.actions.openReviewResponse(reviewSourceRecordsFixture[0].id))

    expect(hook.result.current.model.dialog.kind).toBe("closed")
  })

  it("keeps the newest review request when an older request settles last", async () => {
    const oldRequest = deferred<ReviewsSourceSnapshot>()
    const newRequest = deferred<ReviewsSourceSnapshot>()
    const commands = {
      ...createReviewSourceCommandsFixture(),
      loadReviews: vi.fn().mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise),
    }
    const hook = renderHook(() =>
      useReviewsController({ commands, showManagement: true, snapshot: reviewSourceSnapshotFixture }),
    )

    act(() => {
      hook.result.current.actions.changePage(2)
      hook.result.current.actions.changePage(3)
    })
    await act(async () => {
      newRequest.resolve({
        ...reviewSourceSnapshotFixture,
        page: { ...reviewSourceSnapshotFixture.page, page: 3 },
      })
      await newRequest.promise
    })
    oldRequest.reject(new Error("stale failure"))
    await act(async () => {
      await oldRequest.promise.catch(() => undefined)
    })

    expect(hook.result.current.model.list?.page).toBe(3)
    expect(hook.result.current.model.statusMessage).toBe("")
    expect(hook.result.current.model.isLoading).toBe(false)
  })

  it("restarts publication history after a cursor conflict", async () => {
    const firstPage: ReviewHistorySnapshot = {
      ...reviewHistoryFixture,
      publication: {
        ...reviewHistoryFixture.publication,
        hasNextPage: true,
        nextCursor: "next-cursor",
      },
    }
    const restarted: ReviewHistorySnapshot = {
      ...reviewHistoryFixture,
      publication: {
        entries: [{ ...reviewHistoryFixture.publication.entries[0], id: "publication-restarted" }],
        hasNextPage: false,
      },
    }
    const commands = {
      ...createReviewSourceCommandsFixture(),
      loadHistory: vi
        .fn()
        .mockResolvedValueOnce(firstPage)
        .mockRejectedValueOnce(
          new ReviewSourceCommandError("history-changed", "History changed while paging."),
        )
        .mockResolvedValueOnce(restarted),
    }
    const hook = renderHook(() =>
      useReviewsController({ commands, showManagement: true, snapshot: reviewSourceSnapshotFixture }),
    )

    act(() => hook.result.current.actions.openReviewHistory(reviewSourceRecordsFixture[0].id))
    await waitFor(() => {
      if (hook.result.current.model.dialog.kind !== "history") throw new Error("History dialog missing")
      expect(hook.result.current.model.dialog.history?.publication.hasNextPage).toBe(true)
    })
    act(() => hook.result.current.actions.loadOlderHistory())
    await waitFor(() => {
      if (hook.result.current.model.dialog.kind !== "history") throw new Error("History dialog missing")
      expect(hook.result.current.model.dialog.history?.publication.entries[0]?.id).toBe(
        "publication-restarted",
      )
    })
    expect(commands.loadHistory).toHaveBeenNthCalledWith(2, reviewSourceRecordsFixture[0].id, "next-cursor")
    expect(commands.loadHistory).toHaveBeenNthCalledWith(3, reviewSourceRecordsFixture[0].id)
  })

  it("discards stale history and mutation dialog completions", async () => {
    const staleHistory = deferred<ReviewHistorySnapshot>()
    const mutation = deferred<(typeof reviewSourceRecordsFixture)[1]>()
    const commands = {
      ...createReviewSourceCommandsFixture(),
      loadHistory: vi
        .fn()
        .mockReturnValueOnce(staleHistory.promise)
        .mockResolvedValueOnce({
          ...reviewHistoryFixture,
          reviewId: reviewSourceRecordsFixture[1].id,
        }),
      submitResponse: vi.fn().mockReturnValue(mutation.promise),
    }
    const hook = renderHook(() =>
      useReviewsController({ commands, showManagement: true, snapshot: reviewSourceSnapshotFixture }),
    )

    act(() => hook.result.current.actions.openReviewHistory(reviewSourceRecordsFixture[0].id))
    act(() => hook.result.current.actions.openReviewResponse(reviewSourceRecordsFixture[1].id))
    let mutationResult: Promise<"applied" | "discarded">
    act(() => {
      mutationResult = hook.result.current.actions.submitReviewResponse(
        "Thank you for the detailed feedback. We are reviewing it with our team.",
      )
    })
    act(() => hook.result.current.actions.openReviewHistory(reviewSourceRecordsFixture[1].id))
    await waitFor(() => {
      if (hook.result.current.model.dialog.kind !== "history") throw new Error("History dialog missing")
      expect(hook.result.current.model.dialog.review.id).toBe(reviewSourceRecordsFixture[1].id)
    })

    await act(async () => {
      staleHistory.resolve(reviewHistoryFixture)
      mutation.resolve(reviewSourceRecordsFixture[1])
      await Promise.all([staleHistory.promise, mutation.promise])
    })

    await expect(mutationResult!).resolves.toBe("discarded")
    expect(hook.result.current.model.dialog.kind).toBe("history")
    if (hook.result.current.model.dialog.kind === "history") {
      expect(hook.result.current.model.dialog.review.id).toBe(reviewSourceRecordsFixture[1].id)
    }
  })
})

it("ignores a late old-clinic action denial after its workspace unmounts", async () => {
  const pending = deferred<(typeof reviewSourceRecordsFixture)[0]>()
  const lost = vi.fn()
  const commands = { ...createReviewSourceCommandsFixture(), submitResponse: vi.fn(() => pending.promise) }
  const hook = renderHook(() =>
    useReviewsController({
      commands,
      onSessionLost: lost,
      showManagement: true,
      snapshot: reviewSourceSnapshotFixture,
    }),
  )
  act(() => hook.result.current.actions.openReviewResponse(reviewSourceRecordsFixture[1].id))
  let result!: Promise<"applied" | "discarded">
  act(() => {
    result = hook.result.current.actions.submitReviewResponse(
      "A private original-clinic response remains isolated.",
    )
  })
  expect(commands.submitResponse).toHaveBeenCalledTimes(1)
  hook.unmount()
  await act(async () => {
    pending.reject(new ReviewSourceCommandError("unauthorized", "Late session denial"))
    await result
  })
  expect(lost).not.toHaveBeenCalled()
  await expect(result).resolves.toBe("discarded")
})
