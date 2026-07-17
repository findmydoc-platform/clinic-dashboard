import { describe, expect, it } from "vitest"
import {
  createReviewAppealCase,
  createReviewAppealReference,
  markReviewAppealUnderReview,
  reviewAppealCaseStatuses,
  reviewAppealEventTypes,
} from "@/features/clinic-dashboard/reviews/model/appeal-case"
import { projectClinicReviewForPresentation } from "@/features/clinic-dashboard/reviews/model/review"
import { createReviewsState, reviewsReducer } from "@/features/clinic-dashboard/reviews/model/reviews.reducer"
import { selectReviewsViewModel } from "@/features/clinic-dashboard/reviews/model/reviews.selectors"
import {
  createReviewCommandsFixture,
  reviewsFixture,
  submittedAppealReviewFixture,
  underReviewFixture,
} from "@/features/clinic-dashboard/reviews/testing/reviews.fixtures"

describe("review appeal cases", () => {
  it("keeps appeal statuses and event types closed", () => {
    expect(reviewAppealCaseStatuses).toEqual(["submitted", "under-review"])
    expect(reviewAppealEventTypes).toEqual(["appeal-submitted", "appeal-status-changed"])
  })

  it("creates a deterministic review-owned reference and one submitted event", () => {
    const first = createReviewAppealCase({
      detail: "  This review belongs to another clinic.  ",
      reason: "Incorrect clinic",
      reviewId: "review-anonymous-dentistry",
      submittedAt: "2023-10-16T12:00:00.000Z",
    })
    const second = createReviewAppealCase({
      detail: "A different valid explanation for this appeal.",
      reason: "Privacy concern",
      reviewId: "review-anonymous-dentistry",
      submittedAt: "2023-10-17T12:00:00.000Z",
    })

    expect(createReviewAppealReference("review-anonymous-dentistry")).toBe(
      "APPEAL-REVIEW-ANONYMOUS-DENTISTRY",
    )
    expect(first.reference).toBe(second.reference)
    expect(first).toMatchObject({
      detail: "This review belongs to another clinic.",
      status: "submitted",
      submittedAt: "2023-10-16T12:00:00.000Z",
      updatedAt: "2023-10-16T12:00:00.000Z",
    })
    expect(first.events).toEqual([
      {
        id: "APPEAL-REVIEW-ANONYMOUS-DENTISTRY-EVENT-1",
        occurredAt: "2023-10-16T12:00:00.000Z",
        status: "submitted",
        type: "appeal-submitted",
      },
    ])
  })

  it("requires canonical ISO timestamps and chronological events", () => {
    expect(() =>
      createReviewAppealCase({
        detail: "This review belongs to another clinic.",
        reason: "Incorrect clinic",
        reviewId: "review-anonymous-dentistry",
        submittedAt: "2023-10-16",
      }),
    ).toThrow("canonical ISO")

    const appealCase = createReviewAppealCase({
      detail: "This review belongs to another clinic.",
      reason: "Incorrect clinic",
      reviewId: "review-anonymous-dentistry",
      submittedAt: "2023-10-16T12:00:00.000Z",
    })
    expect(() => markReviewAppealUnderReview(appealCase, appealCase.updatedAt)).toThrow("chronological order")
  })

  it("allows only submitted to under-review and appends one unique event oldest first", () => {
    const submitted = createReviewAppealCase({
      detail: "This review belongs to another clinic.",
      reason: "Incorrect clinic",
      reviewId: "review-anonymous-dentistry",
      submittedAt: "2023-10-16T12:00:00.000Z",
    })
    const underReview = markReviewAppealUnderReview(submitted, "2023-10-16T12:05:00.000Z")

    expect(submitted.status).toBe("submitted")
    expect(underReview.status).toBe("under-review")
    expect(underReview.events.map((event) => event.type)).toEqual([
      "appeal-submitted",
      "appeal-status-changed",
    ])
    expect(underReview.events.map((event) => event.occurredAt)).toEqual([
      "2023-10-16T12:00:00.000Z",
      "2023-10-16T12:05:00.000Z",
    ])
    expect(new Set(underReview.events.map((event) => event.id)).size).toBe(2)
    expect(() => markReviewAppealUnderReview(underReview, "2023-10-16T12:10:00.000Z")).toThrow(
      "Only a submitted appeal case",
    )
  })

  it("deep-clones appeal events and removes appeal data from presentation projection", () => {
    const state = createReviewsState([underReviewFixture])
    const clonedReview = state.reviews[0]

    expect(clonedReview).not.toBe(underReviewFixture)
    expect(clonedReview?.appealCase).not.toBe(underReviewFixture.appealCase)
    expect(clonedReview?.appealCase?.events).not.toBe(underReviewFixture.appealCase?.events)
    expect(clonedReview?.appealCase?.events[0]).not.toBe(underReviewFixture.appealCase?.events[0])

    const projectedReview = projectClinicReviewForPresentation(underReviewFixture)
    expect(projectedReview.appealCase).toBeUndefined()
    expect(projectedReview.internalNotes).toEqual([])
    expect(underReviewFixture.appealCase).toBeDefined()

    const presentation = selectReviewsViewModel(
      createReviewsState(reviewsFixture.items),
      reviewsFixture,
      false,
    )
    expect(presentation.list.reviews.every((review) => review.appealCase === undefined)).toBe(true)
  })

  it("blocks a second appeal in both reducer and command boundaries", async () => {
    const state = createReviewsState(reviewsFixture.items)
    const reopened = reviewsReducer(state, {
      reviewId: submittedAppealReviewFixture.id,
      type: "review-appeal-opened",
    })

    expect(reopened).toBe(state)
    await expect(
      createReviewCommandsFixture().submitReviewAppeal(
        submittedAppealReviewFixture,
        "Incorrect clinic",
        "This second appeal must not be created.",
      ),
    ).rejects.toThrow("already has an appeal case")
  })
})
