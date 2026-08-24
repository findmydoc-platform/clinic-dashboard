"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { RatingStars } from "@/components/ui/rating-stars"
import type { ClinicReviewRecord } from "../../model/review-source"
import type { ReviewMutationResult } from "../../model/reviews-view-model"

type ReviewMutationDialogProps = Readonly<{
  children: ReactNode
  description: string
  isSubmitDisabled: boolean
  onClose: () => void
  onSubmit: () => Promise<ReviewMutationResult>
  review: ClinicReviewRecord
  submitLabel: string
  title: string
}>

export function ReviewMutationDialog({
  children,
  description,
  isSubmitDisabled,
  onClose,
  onSubmit,
  review,
  submitLabel,
  title,
}: ReviewMutationDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const submit = async () => {
    setIsSaving(true)
    setSubmitError("")

    try {
      const result = await onSubmit()
      if (result === "applied") onClose()
    } catch {
      setSubmitError("We couldn't save this change. Try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      description={description}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button disabled={isSaving} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={isSaving || isSubmitDisabled} onClick={submit}>
            {isSaving ? "Saving…" : submitLabel}
          </Button>
        </div>
      }
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
      open
      title={title}
    >
      <div className="grid gap-5">
        <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{review.author}</strong>
            <RatingStars value={review.rating} />
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">
            {review.publicText ?? "The original review text is not available."}
          </p>
        </article>
        {children}
        {submitError ? (
          <p className="text-sm font-bold text-[var(--destructive)]" role="alert">
            {submitError}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
