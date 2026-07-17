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
      description="Submit this clinic response for moderation. Any published response stays unchanged until the pending response is approved."
      initialValue={review.pendingResponse?.response ?? review.publishedResponse}
      label="Response for moderation"
      onClose={onClose}
      onSubmit={(response) => onSubmit({ response })}
      placeholder="Thank the patient and address their feedback…"
      review={review}
      submitLabel="Submit for moderation"
      title="Respond to review"
    />
  )
}
