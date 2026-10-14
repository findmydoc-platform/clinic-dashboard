import type { ClinicReviewRecord } from "./review-source"

export type ReviewOpeningRequest = Readonly<{
  requestId: string
  reviewId: string
  anchor?: Readonly<{ kind: "response" | "appeal" | "occurrence"; id: string }>
}>
export type ReviewOpeningResult = Readonly<{
  requestId: string
  reviewId: string
  status: "displayed" | "unavailable" | "cancelled"
}>
export type ReviewDetailState =
  Readonly<{ status: "loading" | "unavailable" }> | Readonly<{ status: "ready"; review: ClinicReviewRecord }>
