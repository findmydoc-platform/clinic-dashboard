import type { ReviewCommands } from "../model/review-commands"
import { createReviewAppealCase, markReviewAppealUnderReview } from "../model/appeal-case"
import { createPendingReviewResponse, type ClinicReview } from "../model/review"
import type { ReviewsSnapshot } from "../model/reviews-snapshot"

export const reviewsFixture = {
  referenceTime: "2023-10-16T12:00:00.000Z",
  distribution: [
    { count: 1023, percent: 82, stars: 5 },
    { count: 150, percent: 12, stars: 4 },
    { count: 50, percent: 4, stars: 3 },
    { count: 18, percent: 1.5, stars: 2 },
    { count: 7, percent: 0.5, stars: 1 },
  ],
  items: [
    {
      age: "2 days ago",
      author: "Markus Schmidt",
      body: "Excellent consultation and treatment. The team was professional from the first appointment and the early result looks great.",
      createdAt: "2023-10-14T09:00:00.000Z",
      id: "review-markus-schmidt",
      initials: "MS",
      internalNotes: [],
      rating: 5,
      pendingResponse: {
        response: "Thank you. We have shared your feedback with the consultation team.",
        status: "pending-moderation",
        submittedAt: "2023-10-16T12:00:00.000Z",
      },
      publishedResponse:
        "Thank you for your kind feedback. We are pleased that you are happy with the result.",
      status: "Answered",
      treatment: "Hair transplant",
      revision: 3,
    },
    {
      age: "5 days ago",
      author: "Anonymous patient",
      body: "The treatment was good, but the waiting time was longer than expected and communication at reception could improve.",
      createdAt: "2023-10-11T14:30:00.000Z",
      id: "review-anonymous-dentistry",
      initials: "AP",
      internalNotes: [],
      rating: 3,
      status: "Open",
      treatment: "Dentistry",
      revision: 1,
    },
    {
      age: "1 week ago",
      author: "Janine Doe",
      body: "This review is currently hidden while an appeal is assessed.",
      createdAt: "2023-10-09T11:00:00.000Z",
      id: "review-janine-doe",
      initials: "JD",
      internalNotes: [],
      appealCase: {
        detail: "The visit described in this review took place at a different clinic.",
        events: [
          {
            id: "APPEAL-REVIEW-JANINE-DOE-EVENT-1",
            occurredAt: "2023-10-14T09:00:00.000Z",
            status: "submitted",
            type: "appeal-submitted",
          },
          {
            fromStatus: "submitted",
            id: "APPEAL-REVIEW-JANINE-DOE-EVENT-2",
            occurredAt: "2023-10-15T10:30:00.000Z",
            toStatus: "under-review",
            type: "appeal-status-changed",
          },
        ],
        reason: "Incorrect clinic",
        reference: "APPEAL-REVIEW-JANINE-DOE",
        status: "under-review",
        submittedAt: "2023-10-14T09:00:00.000Z",
        updatedAt: "2023-10-15T10:30:00.000Z",
      },
      rating: 1,
      status: "Under review",
      treatment: "Unknown",
      revision: 3,
    },
    {
      age: "2 weeks ago",
      author: "Elena Fischer",
      body: "The consultation was clear and the treatment plan was easy to understand.",
      createdAt: "2023-10-02T10:00:00.000Z",
      id: "review-elena-fischer",
      initials: "EF",
      internalNotes: [],
      rating: 4,
      publishedResponse: "Thank you for the clear feedback about your consultation.",
      status: "Answered",
      treatment: "Dermatology",
      revision: 1,
    },
    {
      age: "3 weeks ago",
      author: "David Müller",
      body: "Friendly team, short waiting time, and a very professional appointment.",
      createdAt: "2023-09-25T08:30:00.000Z",
      id: "review-david-mueller",
      initials: "DM",
      internalNotes: [],
      rating: 5,
      publishedResponse: "Thank you for sharing your experience with our team.",
      status: "Answered",
      treatment: "Dentistry",
      revision: 2,
    },
    {
      age: "2 months ago",
      author: "Anonymous patient",
      body: "The result was good, although appointment coordination took longer than expected.",
      createdAt: "2023-08-21T15:00:00.000Z",
      id: "review-anonymous-coordination",
      initials: "AP",
      internalNotes: [],
      appealCase: {
        detail: "The review includes private appointment information that should be assessed.",
        events: [
          {
            id: "APPEAL-REVIEW-ANONYMOUS-COORDINATION-EVENT-1",
            occurredAt: "2023-09-01T08:15:00.000Z",
            status: "submitted",
            type: "appeal-submitted",
          },
        ],
        reason: "Privacy concern",
        reference: "APPEAL-REVIEW-ANONYMOUS-COORDINATION",
        status: "submitted",
        submittedAt: "2023-09-01T08:15:00.000Z",
        updatedAt: "2023-09-01T08:15:00.000Z",
      },
      rating: 3,
      status: "Open",
      treatment: "Hair transplant",
      revision: 2,
    },
  ],
  rating: 4.8,
  total: 1248,
} satisfies ReviewsSnapshot

export const openReviewFixture = reviewsFixture.items.find(
  (review) => review.status === "Open",
) as ClinicReview
export const publishedReviewFixture = reviewsFixture.items.find(
  (review) => review.status === "Answered" && review.pendingResponse,
) as ClinicReview
export const submittedAppealReviewFixture = reviewsFixture.items.find(
  (review) => review.appealCase?.status === "submitted",
) as ClinicReview
export const underReviewFixture = reviewsFixture.items.find(
  (review) => review.status === "Under review",
) as ClinicReview

export function createReviewCommandsFixture(latencyMs = 0): ReviewCommands {
  const resolve = async <Value>(value: Value) => {
    if (latencyMs > 0) await new Promise((done) => setTimeout(done, latencyMs))
    return value
  }

  return {
    markReviewAppealUnderReview: async (review) => {
      if (!review.appealCase) throw new Error("An appeal case is required.")

      return resolve({
        ...review,
        appealCase: markReviewAppealUnderReview(review.appealCase, "2023-10-16T12:05:00.000Z"),
        revision: review.revision + 1,
        status: "Under review" as const,
      })
    },
    saveReviewNote: async (review, note) =>
      resolve({
        ...review,
        internalNotes: [...review.internalNotes, note.trim()],
        revision: review.revision + 1,
      }),
    submitReviewResponseForModeration: async (review, response) =>
      resolve({
        ...review,
        pendingResponse: createPendingReviewResponse(response, reviewsFixture.referenceTime),
        revision: review.revision + 1,
      }),
    submitReviewAppeal: async (review, reason, detail) => {
      if (review.appealCase) throw new Error("This review already has an appeal case.")

      return resolve({
        ...review,
        appealCase: createReviewAppealCase({
          detail,
          reason,
          reviewId: review.id,
          submittedAt: reviewsFixture.referenceTime,
        }),
        revision: review.revision + 1,
      })
    },
  }
}

export function createRetryReviewCommandsFixture(): ReviewCommands {
  const commands = createReviewCommandsFixture()
  let saveAttempts = 0

  return {
    ...commands,
    submitReviewResponseForModeration: async (...input) => {
      saveAttempts += 1
      if (saveAttempts === 1) throw new Error("Fixture rejection")
      return commands.submitReviewResponseForModeration(...input)
    },
  }
}
