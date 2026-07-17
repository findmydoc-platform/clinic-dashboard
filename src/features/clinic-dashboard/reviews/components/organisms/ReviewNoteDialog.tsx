import type { ClinicReview } from "../../model/review"
import type { ReviewNoteSubmission } from "../../model/review-dialog"
import { ReviewTextMutationDialog } from "./ReviewTextMutationDialog"

type ReviewNoteDialogProps = Readonly<{
  onClose: () => void
  onSubmit: (submission: ReviewNoteSubmission) => Promise<void>
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
