import type {
  ClinicReviewRecord,
  ReviewAppealReason,
  ReviewHistorySnapshot,
  ReviewListFilters,
  ReviewsSourceSnapshot,
} from "./review-source"

export type ReviewSourceCommandErrorKind =
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "history-changed"
  | "not-found"
  | "rejected"
  | "timeout"
  | "unknown"

export class ReviewSourceCommandError extends Error {
  readonly kind: ReviewSourceCommandErrorKind

  constructor(kind: ReviewSourceCommandErrorKind, message: string) {
    super(message)
    this.name = "ReviewSourceCommandError"
    this.kind = kind
  }
}

export type ReviewSourceCommands = Readonly<{
  loadReview: (reviewId: string, signal?: AbortSignal) => Promise<ClinicReviewRecord>
  loadHistory: (reviewId: string, cursor?: string) => Promise<ReviewHistorySnapshot>
  loadReviews: (filters: ReviewListFilters, page: number) => Promise<ReviewsSourceSnapshot>
  submitAppeal: (
    reviewId: string,
    submission: Readonly<{ details: string; reason: ReviewAppealReason }>,
  ) => Promise<ClinicReviewRecord>
  submitResponse: (reviewId: string, body: string) => Promise<ClinicReviewRecord>
}>
