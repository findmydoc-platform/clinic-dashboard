// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { useReviewsController } from "@/features/clinic-dashboard/reviews/hooks/useReviewsController"
import {
  createReviewAppealCase,
  markReviewAppealUnderReview,
} from "@/features/clinic-dashboard/reviews/model/appeal-case"
import type { ReviewCommands } from "@/features/clinic-dashboard/reviews/model/review-commands"
import type { ClinicReview } from "@/features/clinic-dashboard/reviews/model/review"
import type {
  ReviewMutationResult,
  ReviewsActions,
} from "@/features/clinic-dashboard/reviews/model/reviews-view-model"
import {
  createReviewCommandsFixture,
  reviewsFixture,
} from "@/features/clinic-dashboard/reviews/testing/reviews.fixtures"

type Deferred<Value> = Readonly<{
  promise: Promise<Value>
  resolve: (value: Value) => void
}>

type ReviewMutationCommand =
  | "markReviewAppealUnderReview"
  | "saveReviewNote"
  | "submitReviewAppeal"
  | "submitReviewResponseForModeration"

type ReviewMutationCase = Readonly<{
  command: ReviewMutationCommand
  label: string
  mutate: (review: ClinicReview) => ClinicReview
  open: (actions: ReviewsActions, reviewId: string) => void
  selectReview: (reviews: readonly ClinicReview[]) => ClinicReview | undefined
  submit: (actions: ReviewsActions) => Promise<ReviewMutationResult>
}>

function createDeferred<Value>(): Deferred<Value> {
  let resolvePromise: ((value: Value) => void) | undefined
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve
  })

  return {
    promise,
    resolve: (value) => {
      if (!resolvePromise) throw new Error("Deferred promise is not ready.")
      resolvePromise(value)
    },
  }
}

function createDeferredCommands(
  command: ReviewMutationCommand,
  deferred: Deferred<ClinicReview>,
): ReviewCommands {
  const commands = createReviewCommandsFixture()

  return {
    ...commands,
    markReviewAppealUnderReview:
      command === "markReviewAppealUnderReview"
        ? () => deferred.promise
        : commands.markReviewAppealUnderReview,
    saveReviewNote: command === "saveReviewNote" ? () => deferred.promise : commands.saveReviewNote,
    submitReviewResponseForModeration:
      command === "submitReviewResponseForModeration"
        ? () => deferred.promise
        : commands.submitReviewResponseForModeration,
    submitReviewAppeal:
      command === "submitReviewAppeal" ? () => deferred.promise : commands.submitReviewAppeal,
  }
}

const mutationCases: readonly ReviewMutationCase[] = [
  {
    command: "submitReviewResponseForModeration",
    label: "response",
    mutate: (review) => ({
      ...review,
      pendingResponse: {
        response: "A response that resolved after withdrawal.",
        status: "pending-moderation",
        submittedAt: reviewsFixture.referenceTime,
      },
      revision: review.revision + 1,
    }),
    open: (actions, reviewId) => actions.openReviewResponse(reviewId),
    selectReview: (reviews) => reviews.find((review) => review.status === "Open" && !review.appealCase),
    submit: (actions) => actions.submitReviewResponse({ response: "A valid delayed response." }),
  },
  {
    command: "saveReviewNote",
    label: "internal note",
    mutate: (review) => ({
      ...review,
      internalNotes: [...review.internalNotes, "A note that resolved after withdrawal."],
      revision: review.revision + 1,
    }),
    open: (actions, reviewId) => actions.openReviewNote(reviewId),
    selectReview: (reviews) => reviews.find((review) => review.status === "Open" && !review.appealCase),
    submit: (actions) => actions.submitReviewNote({ note: "A valid delayed internal note." }),
  },
  {
    command: "submitReviewAppeal",
    label: "appeal",
    mutate: (review) => ({
      ...review,
      appealCase: createReviewAppealCase({
        detail: "This delayed appeal resolved after management was withdrawn.",
        reason: "Incorrect clinic",
        reviewId: review.id,
        submittedAt: reviewsFixture.referenceTime,
      }),
      revision: review.revision + 1,
    }),
    open: (actions, reviewId) => actions.openReviewAppeal(reviewId),
    selectReview: (reviews) => reviews.find((review) => review.status === "Open" && !review.appealCase),
    submit: (actions) =>
      actions.submitReviewAppeal({
        detail: "This review belongs to another clinic.",
        reason: "Incorrect clinic",
      }),
  },
  {
    command: "markReviewAppealUnderReview",
    label: "appeal status",
    mutate: (review) => {
      if (!review.appealCase) throw new Error("The delayed status transition requires an appeal case.")

      return {
        ...review,
        appealCase: markReviewAppealUnderReview(review.appealCase, "2023-10-16T12:05:00.000Z"),
        revision: review.revision + 1,
        status: "Under review",
      }
    },
    open: (actions, reviewId) => actions.openReviewHistory(reviewId),
    selectReview: (reviews) => reviews.find((review) => review.appealCase?.status === "submitted"),
    submit: (actions) => actions.markReviewAppealUnderReview(),
  },
]

afterEach(cleanup)

describe("reviews controller", () => {
  it("applies the only appeal status transition inside review history", async () => {
    const submittedReview = reviewsFixture.items.find((review) => review.appealCase?.status === "submitted")
    if (!submittedReview) throw new Error("Reviews fixture requires a submitted appeal case.")

    const hook = renderHook(() =>
      useReviewsController({
        commands: createReviewCommandsFixture(),
        showManagement: true,
        snapshot: reviewsFixture,
      }),
    )

    act(() => hook.result.current.actions.openReviewHistory(submittedReview.id))
    let result: ReviewMutationResult | undefined
    await act(async () => {
      result = await hook.result.current.actions.markReviewAppealUnderReview()
    })

    expect(result).toBe("applied")
    expect(hook.result.current.model).toMatchObject({
      dialog: {
        kind: "history",
        review: {
          appealCase: {
            events: [{ type: "appeal-submitted" }, { type: "appeal-status-changed" }],
            status: "under-review",
          },
          status: "Under review",
        },
      },
      statusMessage: "Prototype only — appeal case updated locally; nothing was submitted or sent.",
    })

    hook.unmount()
  })

  it.each(mutationCases)(
    "discards a delayed $label mutation across management off and on",
    async ({ command, label, mutate, open, selectReview, submit }) => {
      const originalReview = selectReview(reviewsFixture.items)
      if (!originalReview) throw new Error(`Reviews fixture requires a review for ${label}.`)

      const deferred = createDeferred<ClinicReview>()
      const commands = createDeferredCommands(command, deferred)
      const hook = renderHook(
        ({ showManagement }) => useReviewsController({ commands, showManagement, snapshot: reviewsFixture }),
        { initialProps: { showManagement: true } },
      )

      act(() => open(hook.result.current.actions, originalReview.id))
      let pendingMutation!: Promise<ReviewMutationResult>
      act(() => {
        pendingMutation = submit(hook.result.current.actions)
      })

      hook.rerender({ showManagement: false })
      expect(hook.result.current.model).toMatchObject({
        dialog: { kind: "closed" },
        showManagement: false,
        statusMessage: "",
      })

      let result: ReviewMutationResult | undefined
      await act(async () => {
        deferred.resolve(mutate(originalReview))
        result = await pendingMutation
      })
      expect(result).toBe("discarded")

      hook.rerender({ showManagement: true })
      expect(hook.result.current.model).toMatchObject({
        dialog: { kind: "closed" },
        showManagement: true,
        statusMessage: "",
      })
      act(() => hook.result.current.actions.openReviewHistory(originalReview.id))
      if (hook.result.current.model.dialog.kind !== "history") {
        throw new Error("Review history should reopen after management is restored.")
      }
      expect(hook.result.current.model.dialog.review).toEqual(originalReview)

      hook.unmount()
    },
  )
})
