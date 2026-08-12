"use client"

import { useRef, useState } from "react"
import { Field } from "@/components/ui/field"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  reviewAppealReasons,
  reviewAppealReasonLabel,
  type ClinicReviewRecord,
  type ReviewAppealReason,
} from "../../model/review-source"
import type { ReviewMutationResult } from "../../model/reviews-view-model"
import { ReviewMutationDialog } from "../molecules/ReviewMutationDialog"

export function ReviewAppealDialog({
  onClose,
  onSubmit,
  review,
}: Readonly<{
  onClose: () => void
  onSubmit: (submission: { details: string; reason: ReviewAppealReason }) => Promise<ReviewMutationResult>
  review: ClinicReviewRecord
}>) {
  const [details, setDetails] = useState("")
  const [reason, setReason] = useState<ReviewAppealReason | "">("")
  const [error, setError] = useState("")
  const detailsRef = useRef<HTMLTextAreaElement>(null)
  const trimmed = details.trim()
  const submit = async () => {
    if (!reason || trimmed.length < 10) {
      setError(reason ? "Enter at least 10 characters." : "Choose an appeal reason.")
      if (reason) detailsRef.current?.focus()
      return "discarded" as const
    }
    return onSubmit({ details: trimmed, reason })
  }
  return (
    <ReviewMutationDialog
      description="An appeal can be submitted once and cannot be edited. The platform team reviews the request; an upheld appeal does not by itself change the public review."
      isSubmitDisabled={!reason || trimmed.length < 10}
      onClose={onClose}
      onSubmit={submit}
      review={review}
      submitLabel="Submit appeal"
      title="Submit review appeal"
    >
      <Field error={!reason && error ? error : undefined} isRequired label="Reason">
        {(props) => (
          <Select
            {...props}
            onValueChange={(value) => {
              setReason(
                reviewAppealReasons.includes(value as ReviewAppealReason)
                  ? (value as ReviewAppealReason)
                  : "",
              )
              setError("")
            }}
            value={reason}
          >
            <option value="">Select a reason…</option>
            {reviewAppealReasons.map((value) => (
              <option key={value} value={value}>
                {reviewAppealReasonLabel(value)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        description={`${trimmed.length}/2,000 characters`}
        error={reason && error ? error : undefined}
        isRequired
        label="Appeal details"
      >
        {(props) => (
          <Textarea
            {...props}
            className="min-h-36"
            maxLength={2000}
            onValueChange={(value) => {
              setDetails(value)
              setError("")
            }}
            placeholder="Explain why this review should be assessed…"
            ref={detailsRef}
            value={details}
          />
        )}
      </Field>
    </ReviewMutationDialog>
  )
}
