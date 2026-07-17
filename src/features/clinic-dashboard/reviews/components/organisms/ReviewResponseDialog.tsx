import type { ClinicReview } from "../../model/review"
import type { ReviewResponseSubmission } from "../../model/review-dialog"
import type { ReviewMutationResult } from "../../model/reviews-view-model"
import { ReviewTextMutationDialog } from "../molecules/ReviewTextMutationDialog"

type ReviewResponseDialogProps = Readonly<{
  onClose: () => void
  onSubmit: (submission: ReviewResponseSubmission) => Promise<ReviewMutationResult>
  review: ClinicReview
}>

export function ReviewResponseDialog({ onClose, onSubmit, review }: ReviewResponseDialogProps) {
  return (
    <ReviewTextMutationDialog
      description="Save a local moderation preview. Any published response stays unchanged. Nothing is submitted or sent."
      initialValue={review.pendingResponse?.response ?? review.publishedResponse}
      label="Response for moderation"
      onClose={onClose}
      onSubmit={(response) => onSubmit({ response })}
      placeholder="Thank the patient and address their feedback…"
      review={review}
      submitLabel="Save moderation preview"
      title="Respond to review"
    />
  )
}
