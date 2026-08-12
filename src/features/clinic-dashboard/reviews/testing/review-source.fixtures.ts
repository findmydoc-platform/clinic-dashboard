import type { ReviewSourceCommands } from "../model/review-source-commands"
import type {
  ClinicReviewRecord,
  ReviewHistorySnapshot,
  ReviewListFilters,
  ReviewsSourceSnapshot,
} from "../model/review-source"

export const reviewSourceRecordsFixture = [
  {
    author: "Maya K.",
    id: "review-source-public",
    initials: "MK",
    publicMeasure: "none",
    publicText: "Outstanding implant process and excellent communication.",
    rating: 5,
    response: {
      id: "response-public",
      published: {
        approvedAt: "2026-01-06T10:00:00.000Z",
        body: "Thank you for your feedback. We are glad the process met your expectations.",
      },
      status: "approved",
    },
    reviewDate: "2026-01-05T10:00:00.000Z",
    treatment: { id: "dentistry", label: "Dentistry" },
    withdrawalState: "active",
  },
  {
    author: "Anonymous patient",
    id: "review-source-context",
    initials: "AP",
    publicMeasure: "context",
    publicNotice: "The clinic supplied additional context after publication.",
    publicText: "Clean facility and very careful aftercare.",
    rating: 5,
    response: {
      id: "response-pending",
      pending: {
        body: "Thank you for the detailed feedback. We have shared it with the aftercare team.",
        submittedAt: "2026-01-21T13:00:00.000Z",
      },
      published: {
        approvedAt: "2026-01-09T09:00:00.000Z",
        body: "Thank you for describing your experience with our team.",
      },
      status: "pending",
    },
    reviewDate: "2026-01-08T12:30:00.000Z",
    treatment: { id: "hair", label: "Hair transplant" },
    withdrawalState: "active",
  },
  {
    appeal: {
      createdAt: "2026-01-19T09:00:00.000Z",
      decidedAt: "2026-01-24T10:00:00.000Z",
      decisionReason: "The review requires a separate moderation decision.",
      details: "The review includes details that could identify another patient.",
      id: "appeal-upheld",
      reason: "privacy_concern",
      status: "upheld",
    },
    author: "Anonymous patient",
    id: "review-source-removed",
    initials: "AP",
    publicMeasure: "removed",
    rating: 4,
    reviewDate: "2026-01-18T10:10:00.000Z",
    treatment: { id: "dentistry", label: "Dentistry" },
    withdrawalState: "active",
  },
] as const satisfies readonly ClinicReviewRecord[]

export const reviewSourceSnapshotFixture: ReviewsSourceSnapshot = {
  page: { items: reviewSourceRecordsFixture, limit: 10, page: 1, pageCount: 1, total: 3 },
  referenceTime: "2026-02-01T00:00:00.000Z",
  summary: {
    distribution: [
      { count: 2, percent: 66.7, stars: 5 },
      { count: 1, percent: 33.3, stars: 4 },
      { count: 0, percent: 0, stars: 3 },
      { count: 0, percent: 0, stars: 2 },
      { count: 0, percent: 0, stars: 1 },
    ],
    rating: 4.7,
    total: 3,
  },
  treatments: [
    { id: "dentistry", label: "Dentistry" },
    { id: "hair", label: "Hair transplant" },
  ],
}

export const reviewHistoryFixture: ReviewHistorySnapshot = {
  appeal: [],
  publication: {
    entries: [
      {
        actorType: "system",
        id: "publication-current",
        publicAuthorName: "Maya K.",
        publicMeasure: "none",
        publicText: "Outstanding implant process and excellent communication.",
        recordedAt: "2026-01-05T10:00:00.000Z",
        reviewDate: "2026-01-05T10:00:00.000Z",
        starRating: 5,
        status: "approved",
        withdrawalState: "active",
      },
    ],
    hasNextPage: false,
  },
  response: [],
  reviewId: "review-source-public",
}

export function createReviewSourceCommandsFixture(): ReviewSourceCommands {
  let records = reviewSourceRecordsFixture.map((record) => structuredClone(record)) as ClinicReviewRecord[]
  const currentSnapshot = (filters: ReviewListFilters): ReviewsSourceSnapshot => ({
    ...reviewSourceSnapshotFixture,
    page: {
      ...reviewSourceSnapshotFixture.page,
      items: records.filter((review) => {
        if (filters.rating !== "all" && review.rating !== Number(filters.rating)) return false
        if (filters.treatment !== "all" && review.treatment.id !== filters.treatment) return false
        if (filters.visibility === "removed") return review.publicMeasure === "removed"
        return true
      }),
    },
  })
  return {
    async loadHistory(reviewId) {
      return { ...reviewHistoryFixture, reviewId }
    },
    async loadReviews(filters) {
      return currentSnapshot(filters)
    },
    async submitAppeal(reviewId, submission) {
      const review = records.find(({ id }) => id === reviewId)
      if (!review) throw new Error("Review not found")
      const updated: ClinicReviewRecord = {
        ...review,
        appeal: {
          ...submission,
          createdAt: "2026-02-01T10:00:00.000Z",
          id: `appeal-${reviewId}`,
          status: "submitted",
        },
      }
      records = records.map((item) => (item.id === reviewId ? updated : item))
      return updated
    },
    async submitResponse(reviewId, body) {
      const review = records.find(({ id }) => id === reviewId)
      if (!review) throw new Error("Review not found")
      const updated: ClinicReviewRecord = {
        ...review,
        response: {
          id: review.response?.id ?? `response-${reviewId}`,
          pending: { body, submittedAt: "2026-02-01T10:00:00.000Z" },
          published: review.response?.published,
          status: "pending",
        },
      }
      records = records.map((item) => (item.id === reviewId ? updated : item))
      return updated
    },
  }
}
