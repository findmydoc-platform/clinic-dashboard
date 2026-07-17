import type { ReviewAppealReason } from "./appeal-case"
import type { ClinicReview } from "./review"

export type ReviewCommands = Readonly<{
  markReviewAppealUnderReview: (review: ClinicReview) => Promise<ClinicReview>
  saveReviewNote: (review: ClinicReview, note: string) => Promise<ClinicReview>
  submitReviewResponseForModeration: (review: ClinicReview, response: string) => Promise<ClinicReview>
  submitReviewAppeal: (
    review: ClinicReview,
    reason: ReviewAppealReason,
    detail: string,
  ) => Promise<ClinicReview>
}>
