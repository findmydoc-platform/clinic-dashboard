import { cloneReviewAppealCase, type ReviewAppealCase } from "./appeal-case"

export const reviewStatuses = ["Answered", "Open", "Under review"] as const

const pendingReviewResponseStatus = "pending-moderation" as const

export type ReviewStatus = (typeof reviewStatuses)[number]

export type PendingReviewResponse = Readonly<{
  response: string
  status: typeof pendingReviewResponseStatus
  submittedAt: string
}>

type ClinicReviewFields = {
  age: string
  appealCase?: ReviewAppealCase
  author: string
  body: string
  createdAt: string
  id: string
  initials: string
  internalNotes: readonly string[]
  pendingResponse?: PendingReviewResponse
  rating: 1 | 2 | 3 | 4 | 5
  revision: number
  treatment: string
}

export type ClinicReview =
  | Readonly<ClinicReviewFields & { publishedResponse: string; status: "Answered" }>
  | Readonly<
      ClinicReviewFields & {
        publishedResponse?: string
        status: Exclude<ReviewStatus, "Answered">
      }
    >

export function createPendingReviewResponse(response: string, submittedAt: string): PendingReviewResponse {
  const trimmedResponse = response.trim()
  if (trimmedResponse.length < 10) {
    throw new Error("A review response requires at least 10 characters.")
  }

  return {
    response: trimmedResponse,
    status: pendingReviewResponseStatus,
    submittedAt,
  }
}

export function cloneClinicReview(review: ClinicReview): ClinicReview {
  return {
    ...review,
    appealCase: review.appealCase ? cloneReviewAppealCase(review.appealCase) : undefined,
    internalNotes: [...review.internalNotes],
    pendingResponse: review.pendingResponse ? { ...review.pendingResponse } : undefined,
  }
}

export function projectClinicReviewForPresentation(review: ClinicReview): ClinicReview {
  return {
    ...review,
    appealCase: undefined,
    internalNotes: [],
    pendingResponse: undefined,
  }
}
