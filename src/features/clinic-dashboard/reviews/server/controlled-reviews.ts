import "server-only"

import type {
  ClinicReviewRecord,
  ReviewHistorySnapshot,
  ReviewListFilters,
  ReviewsSourceSnapshot,
} from "../model/review-source"
import { canSubmitReviewResponse } from "../model/review-source"
import type { ReviewProvider } from "./review-provider"

const treatments = [
  { id: "treatment-dentistry", label: "Dentistry" },
  { id: "treatment-hair", label: "Hair transplant" },
] as const

const controlledReviews = [
  {
    author: "Maya K.",
    id: "seed-review-01",
    initials: "MK",
    publicMeasure: "none",
    publicText: "Outstanding implant process and excellent communication.",
    rating: 5,
    response: {
      id: "seed-review-response-01",
      published: {
        approvedAt: "2026-01-06T10:00:00.000Z",
        body: "Thank you for your feedback. We are glad the implant process and communication met your expectations.",
      },
      status: "approved",
    },
    reviewDate: "2026-01-05T10:00:00.000Z",
    treatment: treatments[0],
    withdrawalState: "active",
  },
  {
    author: "Anonymous patient",
    id: "seed-review-02",
    initials: "AP",
    publicMeasure: "context",
    publicNotice: "The clinic supplied additional context after publication.",
    publicText: "Clean facility and very careful aftercare.",
    rating: 5,
    response: {
      id: "seed-review-response-02",
      pending: {
        body: "Thank you for your detailed feedback. We are pleased the facility and aftercare process felt reassuring.",
        submittedAt: "2026-01-21T13:00:00.000Z",
      },
      published: {
        approvedAt: "2026-01-09T09:00:00.000Z",
        body: "Thank you for describing your experience. We have shared your positive note with the aftercare team.",
      },
      status: "pending",
    },
    reviewDate: "2026-01-08T12:30:00.000Z",
    treatment: treatments[1],
    withdrawalState: "active",
  },
  {
    author: "Anonymous patient",
    id: "seed-review-03",
    initials: "AP",
    publicMeasure: "redaction",
    publicNotice:
      "Parts of this review were removed to protect legal rights or personal data. The remaining text is unchanged.",
    publicText: "Great result with minor waiting time.",
    rating: 4,
    response: {
      id: "seed-review-response-03",
      moderatedAt: "2026-01-22T08:30:00.000Z",
      published: {
        approvedAt: "2026-01-13T09:00:00.000Z",
        body: "Thank you for noting the result and the waiting time. We are reviewing the admission handover with our team.",
      },
      status: "rejected",
    },
    reviewDate: "2026-01-12T09:15:00.000Z",
    treatment: treatments[0],
    withdrawalState: "active",
  },
  {
    appeal: {
      createdAt: "2026-01-16T09:00:00.000Z",
      details: "The clinic believes this review refers to a different location with a similar name.",
      id: "seed-review-appeal-01",
      reason: "incorrect_clinic",
      status: "submitted",
    },
    author: "Omar Y.",
    id: "seed-review-04",
    initials: "OY",
    publicMeasure: "none",
    publicText: "Surgery outcome matched expectations exactly.",
    rating: 5,
    reviewDate: "2026-01-15T15:45:00.000Z",
    treatment: treatments[1],
    withdrawalState: "active",
  },
  {
    appeal: {
      createdAt: "2026-01-18T08:00:00.000Z",
      details:
        "The clinic requests moderation because the review contains language unrelated to the treatment.",
      id: "seed-review-appeal-02",
      reason: "inappropriate_content",
      status: "under_review",
    },
    author: "Anonymous patient",
    id: "seed-review-05",
    initials: "AP",
    publicMeasure: "placeholder",
    publicNotice: "This review was moderated. Its written content is not publicly available.",
    rating: 4,
    reviewDate: "2026-01-17T11:00:00.000Z",
    treatment: treatments[0],
    withdrawalState: "active",
  },
  {
    appeal: {
      createdAt: "2026-01-19T09:00:00.000Z",
      decidedAt: "2026-01-24T10:00:00.000Z",
      decisionReason:
        "The review contains information about another patient and requires a separate moderation decision.",
      details: "The clinic reports that the review includes details that could identify another patient.",
      id: "seed-review-appeal-03",
      reason: "privacy_concern",
      status: "upheld",
    },
    author: "Anonymous patient",
    id: "seed-review-06",
    initials: "AP",
    publicMeasure: "removed",
    rating: 4,
    reviewDate: "2026-01-18T10:10:00.000Z",
    treatment: treatments[0],
    withdrawalState: "active",
  },
  {
    appeal: {
      createdAt: "2026-01-22T09:00:00.000Z",
      decidedAt: "2026-01-24T11:30:00.000Z",
      decisionReason: "The treatment context was verified and the approved patient review remains public.",
      details: "The clinic asks the moderation team to verify the documented treatment context.",
      id: "seed-review-appeal-04",
      reason: "other",
      status: "dismissed",
    },
    author: "Emir D.",
    id: "seed-review-07",
    initials: "ED",
    publicMeasure: "none",
    rating: 4,
    reviewDate: "2026-01-21T14:20:00.000Z",
    treatment: treatments[1],
    withdrawalState: "withdrawn",
    withdrawnAt: "2026-01-25T12:00:00.000Z",
  },
  {
    author: "Anonymous patient",
    id: "seed-review-08",
    initials: "AP",
    publicMeasure: "none",
    publicText: "Good results overall but communication can improve.",
    rating: 3,
    response: {
      id: "seed-review-response-08",
      moderatedAt: "2026-01-26T12:00:00.000Z",
      status: "blocked",
    },
    reviewDate: "2026-01-22T08:00:00.000Z",
    treatment: treatments[0],
    withdrawalState: "active",
  },
] as const satisfies readonly ClinicReviewRecord[]

type ControlledReviewState = { reviews: ClinicReviewRecord[] }

function controlledState() {
  const controlledGlobal = globalThis as typeof globalThis & {
    __findmydocControlledReviews?: ControlledReviewState
  }
  controlledGlobal.__findmydocControlledReviews ??= {
    reviews: controlledReviews.map((review) => structuredClone(review)),
  }
  return controlledGlobal.__findmydocControlledReviews
}

export function resetControlledReviewProvider() {
  controlledState().reviews = controlledReviews.map((review) => structuredClone(review))
}

function matchesFilters(review: ClinicReviewRecord, filters: ReviewListFilters) {
  if (filters.rating !== "all" && review.rating !== Number(filters.rating)) return false
  if (filters.treatment !== "all" && review.treatment.id !== filters.treatment) return false
  if (filters.period !== "all") {
    const age = (Date.parse("2026-02-01T00:00:00.000Z") - Date.parse(review.reviewDate)) / 86_400_000
    if (age < 0 || age > Number(filters.period)) return false
  }
  if (filters.visibility === "published") {
    return review.withdrawalState === "active" && review.publicMeasure !== "removed"
  }
  if (filters.visibility === "moderated") return review.publicMeasure !== "none"
  if (filters.visibility === "removed") return review.publicMeasure === "removed"
  if (filters.visibility === "withdrawn") return review.withdrawalState === "withdrawn"
  return true
}

function snapshot(filters: ReviewListFilters, page: number): ReviewsSourceSnapshot {
  const state = controlledState()
  const filtered = state.reviews.filter((review) => matchesFilters(review, filters))
  const limit = 3
  const pageCount = Math.max(1, Math.ceil(filtered.length / limit))
  const safePage = Math.min(Math.max(page, 1), pageCount)
  const start = (safePage - 1) * limit
  const counts = new Map([1, 2, 3, 4, 5].map((stars) => [stars, 0]))
  for (const review of state.reviews) counts.set(review.rating, (counts.get(review.rating) ?? 0) + 1)
  const total = state.reviews.length
  const average = total ? state.reviews.reduce((sum, review) => sum + review.rating, 0) / total : 0

  return {
    page: {
      items: filtered.slice(start, start + limit).map((review) => structuredClone(review)),
      limit,
      page: safePage,
      pageCount,
      total: filtered.length,
    },
    referenceTime: "2026-02-01T00:00:00.000Z",
    summary: {
      distribution: [5, 4, 3, 2, 1].map((stars) => ({
        count: counts.get(stars) ?? 0,
        percent: total ? ((counts.get(stars) ?? 0) / total) * 100 : 0,
        stars: stars as 1 | 2 | 3 | 4 | 5,
      })),
      rating: Number(average.toFixed(1)),
      total,
    },
    treatments,
  }
}

function history(reviewId: string, cursor?: string): ReviewHistorySnapshot {
  const review = controlledState().reviews.find(({ id }) => id === reviewId)
  if (!review) throw new Error("Controlled review is missing")
  const publicationEntries = [
    {
      actorType: review.withdrawalState === "withdrawn" ? "patient" : "system",
      id: `${review.id}-publication-current`,
      publicAuthorName: review.publicText ? review.author : undefined,
      publicMeasure: review.publicMeasure,
      publicNotice: review.publicNotice,
      publicText: review.publicText,
      recordedAt: review.withdrawnAt ?? review.reviewDate,
      reviewDate: review.reviewDate,
      starRating: review.rating,
      status: "approved",
      withdrawalSource: review.withdrawalState === "withdrawn" ? "patient" : undefined,
      withdrawalState: review.withdrawalState,
      withdrawnAt: review.withdrawnAt,
    },
    {
      actorType: "system",
      id: `${review.id}-publication-created`,
      publicMeasure: "none",
      recordedAt: review.reviewDate,
      reviewDate: review.reviewDate,
      starRating: review.rating,
      status: "approved",
      withdrawalState: "active",
    },
  ] as const
  const entries =
    cursor === "controlled-page-2" ? publicationEntries.slice(1) : publicationEntries.slice(0, 1)

  return {
    appeal: review.appeal
      ? [
          {
            action: review.appeal.status,
            actorType: review.appeal.status === "submitted" ? "clinic_staff" : "platform_staff",
            decidedAt: review.appeal.decidedAt,
            decisionReason: review.appeal.decisionReason,
            id: `${review.appeal.id}-version-current`,
            recordedAt: review.appeal.decidedAt ?? review.appeal.createdAt,
            status: review.appeal.status,
          },
        ]
      : [],
    publication: {
      entries,
      hasNextPage: cursor === undefined,
      nextCursor: cursor === undefined ? "controlled-page-2" : undefined,
    },
    response: review.response
      ? [
          {
            action: review.response.status === "pending" ? "revision_submitted" : review.response.status,
            actorType: review.response.status === "pending" ? "clinic_staff" : "platform_staff",
            id: `${review.response.id}-version-current`,
            pendingBody: review.response.pending?.body,
            publishedBody: review.response.published?.body,
            recordedAt:
              review.response.moderatedAt ??
              review.response.pending?.submittedAt ??
              review.response.published?.approvedAt ??
              review.reviewDate,
            status: review.response.status,
          },
        ]
      : [],
    reviewId,
  }
}

export function createControlledReviewProvider(): ReviewProvider {
  return {
    async loadHistory(reviewId, cursor) {
      const review = controlledState().reviews.find(({ id }) => id === reviewId)
      return review ? { ok: true, value: history(reviewId, cursor) } : { error: "not-found", ok: false }
    },
    async loadReviews(filters, page) {
      return { ok: true, value: snapshot(filters, page) }
    },
    async submitAppeal(reviewId, submission) {
      const state = controlledState()
      const index = state.reviews.findIndex(({ id }) => id === reviewId)
      const review = state.reviews[index]
      if (!review) return { error: "not-found", ok: false }
      if (review.appeal) return { error: "conflict", ok: false }
      const updated = {
        ...review,
        appeal: {
          createdAt: "2026-02-01T10:00:00.000Z",
          details: submission.details,
          id: `controlled-appeal-${reviewId}`,
          reason: submission.reason,
          status: "submitted" as const,
        },
      }
      state.reviews[index] = updated
      return { ok: true, value: structuredClone(updated) }
    },
    async submitResponse(reviewId, body) {
      const state = controlledState()
      const index = state.reviews.findIndex(({ id }) => id === reviewId)
      const review = state.reviews[index]
      if (!review) return { error: "not-found", ok: false }
      if (!canSubmitReviewResponse(review)) return { error: "conflict", ok: false }
      const updated = {
        ...review,
        response: {
          id: review.response?.id ?? `controlled-response-${reviewId}`,
          pending: { body, submittedAt: "2026-02-01T10:00:00.000Z" },
          published: review.response?.published,
          status: "pending" as const,
        },
      }
      state.reviews[index] = updated
      return { ok: true, value: structuredClone(updated) }
    },
  }
}
