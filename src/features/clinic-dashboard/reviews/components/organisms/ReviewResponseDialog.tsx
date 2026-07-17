import type { ClinicReview } from "../../model/review"
import type { ReviewResponseSubmission } from "../../model/review-dialog"
import { ReviewTextMutationDialog } from "./ReviewTextMutationDialog"

type ReviewResponseDialogProps = Readonly<{
  onClose: () => void
  onSubmit: (submission: ReviewResponseSubmission) => Promise<void>
  review: ClinicReview
}>

export function ReviewResponseDialog({ onClose, onSubmit, review }: ReviewResponseDialogProps) {
  return (
    <ReviewTextMutationDialog
      description="Write the public clinic response shown below the review."
      initialValue={review.response}
      label="Public response"
      onClose={onClose}
      onSubmit={(response) => onSubmit({ response })}
      placeholder="Thank the patient and address their feedback…"
      review={review}
      submitLabel="Save response"
      title="Respond to review"
    />
  )
}
