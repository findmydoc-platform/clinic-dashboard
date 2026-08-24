import "server-only"

import type {
  ClinicReviewRecord,
  ReviewAppealReason,
  ReviewHistorySnapshot,
  ReviewListFilters,
  ReviewsSourceSnapshot,
} from "../model/review-source"

export type ReviewReadError = "forbidden" | "invalid-data" | "timeout" | "unauthorized" | "unavailable"
export type ReviewChangeError = ReviewReadError | "conflict" | "invalid-input" | "not-found"
export type ReviewHistoryError = ReviewReadError | "history-changed" | "not-found"

export type ReviewProviderResult<TValue, TError extends string> =
  Readonly<{ ok: true; value: TValue }> | Readonly<{ error: TError; ok: false }>

export type ReviewProvider = Readonly<{
  loadHistory: (
    reviewId: string,
    cursor?: string,
  ) => Promise<ReviewProviderResult<ReviewHistorySnapshot, ReviewHistoryError>>
  loadReviews: (
    filters: ReviewListFilters,
    page: number,
  ) => Promise<ReviewProviderResult<ReviewsSourceSnapshot, ReviewReadError>>
  submitAppeal: (
    reviewId: string,
    submission: Readonly<{ details: string; reason: ReviewAppealReason }>,
  ) => Promise<ReviewProviderResult<ClinicReviewRecord, ReviewChangeError>>
  submitResponse: (
    reviewId: string,
    body: string,
  ) => Promise<ReviewProviderResult<ClinicReviewRecord, ReviewChangeError>>
}>

export type ReviewProviderFactory = (accessToken: string, clinicId: string) => ReviewProvider
