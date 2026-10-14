import type { ClinicReviewRecord } from "../../model/review-source"
import type { ReviewMutationResult } from "../../model/reviews-view-model"
import { ReviewTextMutationDialog } from "../molecules/ReviewTextMutationDialog"

export function ReviewResponseDialog({
  onClose,
  onNavigationRequestChange,
  onSubmit,
  review,
}: Readonly<{
  onNavigationRequestChange?: (
    request: ((continuation: () => void, onCancel?: () => void) => void) | null,
  ) => void
  onClose: () => void
  onSubmit: (body: string) => Promise<ReviewMutationResult>
  review: ClinicReviewRecord
}>) {
  return (
    <ReviewTextMutationDialog
      description="Submit a clinic response for platform moderation. A published response stays visible until its replacement is approved."
      initialValue={review.response?.pending?.body ?? review.response?.published?.body}
      label="Clinic response"
      onClose={onClose}
      onNavigationRequestChange={onNavigationRequestChange}
      onSubmit={onSubmit}
      placeholder="Thank the patient and address their feedback…"
      review={review}
      submitLabel="Submit for moderation"
      title={review.response?.pending ? "Edit pending response" : "Respond to review"}
    />
  )
}
