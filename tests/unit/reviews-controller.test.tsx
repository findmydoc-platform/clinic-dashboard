// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { useReviewsController } from "@/features/clinic-dashboard/reviews/hooks/useReviewsController"
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

type ReviewMutationCommand = "saveReviewNote" | "submitReviewAppeal" | "submitReviewResponseForModeration"

type ReviewMutationCase = Readonly<{
  command: ReviewMutationCommand
  label: string
  mutate: (review: ClinicReview) => ClinicReview
  open: (actions: ReviewsActions, reviewId: string) => void
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
    submit: (actions) => actions.submitReviewNote({ note: "A valid delayed internal note." }),
  },
  {
    command: "submitReviewAppeal",
    label: "appeal",
    mutate: (review) => ({
      ...review,
      notice: "An appeal that resolved after withdrawal.",
      revision: review.revision + 1,
      status: "Under review",
    }),
    open: (actions, reviewId) => actions.openReviewAppeal(reviewId),
    submit: (actions) =>
      actions.submitReviewAppeal({
        detail: "This review belongs to another clinic.",
        reason: "Incorrect clinic",
      }),
  },
]

afterEach(cleanup)

describe("reviews controller", () => {
  it.each(mutationCases)(
    "discards a delayed $label mutation across management off and on",
    async ({ command, mutate, open, submit }) => {
      const originalReview = reviewsFixture.items.find((review) => review.status === "Open")
      if (!originalReview) throw new Error("Reviews fixture requires an open review.")

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
      expect(
        hook.result.current.model.list.reviews.find((review) => review.id === originalReview.id),
      ).toEqual(originalReview)

      hook.unmount()
    },
  )
})
