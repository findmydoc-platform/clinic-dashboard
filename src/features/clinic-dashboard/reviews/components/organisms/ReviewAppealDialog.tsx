"use client"

import { useRef, useState } from "react"
import { Field } from "@/components/ui/field"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ClinicReview } from "../../model/review"
import {
  isReviewAppealReason,
  reviewAppealReasons,
  type ReviewAppealReason,
  type ReviewAppealSubmission,
} from "../../model/review-dialog"
import type { ReviewMutationResult } from "../../model/reviews-view-model"
import { ReviewMutationDialog } from "../molecules/ReviewMutationDialog"

type ReviewAppealDialogProps = Readonly<{
  onClose: () => void
  onSubmit: (submission: ReviewAppealSubmission) => Promise<ReviewMutationResult>
  review: ClinicReview
}>

export function ReviewAppealDialog({ onClose, onSubmit, review }: ReviewAppealDialogProps) {
  const [detail, setDetail] = useState("")
  const [reason, setReason] = useState<ReviewAppealReason | "">("")
  const [detailError, setDetailError] = useState("")
  const [reasonError, setReasonError] = useState("")
  const detailRef = useRef<HTMLTextAreaElement>(null)
  const reasonRef = useRef<HTMLSelectElement>(null)
  const trimmedDetail = detail.trim()

  const submit = async () => {
    if (!reason) {
      setReasonError("Choose an appeal reason.")
      reasonRef.current?.focus()
      return "discarded" as const
    }
    if (trimmedDetail.length < 10) {
      setDetailError("Enter at least 10 characters.")
      detailRef.current?.focus()
      return "discarded" as const
    }

    setDetailError("")
    setReasonError("")
    return onSubmit({ detail: trimmedDetail, reason })
  }

  return (
    <ReviewMutationDialog
      description="Save a local appeal-case preview. Nothing is submitted or sent."
      isSubmitDisabled={!reason || trimmedDetail.length < 10}
      onClose={onClose}
      onSubmit={submit}
      review={review}
      submitLabel="Save appeal preview"
      title="Appeal review"
    >
      <Field error={reasonError || undefined} isRequired label="Reason">
        {(controlProps) => (
          <Select
            {...controlProps}
            onValueChange={(value) => {
              setReason(isReviewAppealReason(value) ? value : "")
              setReasonError("")
            }}
            ref={reasonRef}
            value={reason}
          >
            <option value="">Select a reason…</option>
            {reviewAppealReasons.map((appealReason) => (
              <option key={appealReason} value={appealReason}>
                {appealReason}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        description={`Minimum 10 characters · ${trimmedDetail.length} entered`}
        error={detailError || undefined}
        isRequired
        label="Appeal details"
      >
        {(controlProps) => (
          <Textarea
            {...controlProps}
            className="min-h-36"
            onValueChange={(value) => {
              setDetail(value)
              setDetailError("")
            }}
            placeholder="Explain why this review should be assessed…"
            ref={detailRef}
            value={detail}
          />
        )}
      </Field>
    </ReviewMutationDialog>
  )
}
