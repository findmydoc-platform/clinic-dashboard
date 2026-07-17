import type { ClinicReview } from "../../model/review"
import type { ReviewNoteSubmission } from "../../model/review-dialog"
import type { ReviewMutationResult } from "../../model/reviews-view-model"
import { ReviewTextMutationDialog } from "../molecules/ReviewTextMutationDialog"

type ReviewNoteDialogProps = Readonly<{
  onClose: () => void
  onSubmit: (submission: ReviewNoteSubmission) => Promise<ReviewMutationResult>
  review: ClinicReview
}>

export function ReviewNoteDialog({ onClose, onSubmit, review }: ReviewNoteDialogProps) {
  return (
    <ReviewTextMutationDialog
      description="Add an internal note that is never shown on the public profile."
      label="Internal note"
      onClose={onClose}
      onSubmit={(note) => onSubmit({ note })}
      placeholder="Add context for the clinic team…"
      review={review}
      submitLabel="Save note"
      title="Add internal note"
    />
  )
}
