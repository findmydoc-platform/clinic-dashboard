import type { ClinicReview } from "./review"
import type { ReviewAppealReason } from "./appeal-case"

export type ReviewAppealSubmission = Readonly<{
  detail: string
  reason: ReviewAppealReason
}>

export type ReviewNoteSubmission = Readonly<{
  note: string
}>

export type ReviewResponseSubmission = Readonly<{
  response: string
}>

export type ReviewDialogSelection =
  | Readonly<{ kind: "appeal"; reviewId: string }>
  | Readonly<{ kind: "closed" }>
  | Readonly<{ kind: "history"; reviewId: string }>
  | Readonly<{ kind: "note"; reviewId: string }>
  | Readonly<{ kind: "response"; reviewId: string }>

export type ReviewDialogModel =
  | Readonly<{ kind: "appeal"; review: ClinicReview }>
  | Readonly<{ kind: "closed" }>
  | Readonly<{ kind: "history"; review: ClinicReview }>
  | Readonly<{ kind: "note"; review: ClinicReview }>
  | Readonly<{ kind: "response"; review: ClinicReview }>
