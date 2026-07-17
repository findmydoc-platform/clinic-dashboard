import type { ClinicReview } from "./review"

export type ReviewCommands = Readonly<{
  saveReviewNote: (review: ClinicReview, note: string) => Promise<ClinicReview>
  submitReviewResponseForModeration: (review: ClinicReview, response: string) => Promise<ClinicReview>
  submitReviewAppeal: (review: ClinicReview, reason: string, detail: string) => Promise<ClinicReview>
}>
