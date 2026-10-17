"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { RatingStars } from "@/components/ui/rating-stars"
import type { EditorDepartureIntent } from "@/lib/editor-departure"
import type { ClinicReviewRecord } from "../../model/review-source"
import type { ReviewMutationResult } from "../../model/reviews-view-model"

type ReviewMutationDialogProps = Readonly<{
  children: ReactNode
  description: string
  draft: unknown
  isDirty: boolean
  isSubmitDisabled: boolean
  onNavigationRequestChange?: (
    request: ((continuation: () => void, onCancel?: () => void) => void) | null,
  ) => void
  onClose: () => void
  onSubmit: () => Promise<ReviewMutationResult>
  review: ClinicReviewRecord
  submitLabel: string
  title: string
}>

export function ReviewMutationDialog({
  children,
  description,
  draft,
  isDirty,
  isSubmitDisabled,
  onNavigationRequestChange,
  onClose,
  onSubmit,
  review,
  submitLabel,
  title,
}: ReviewMutationDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const [isLeaveConfirmationOpen, setIsLeaveConfirmationOpen] = useState(false)
  const pendingNavigation = useRef<{ continuation: () => void; onCancel?: () => void } | null>(null)
  const isSavingRef = useRef(false)
  const cancelNavigation = useCallback(() => {
    const pending = pendingNavigation.current
    pendingNavigation.current = null
    setIsLeaveConfirmationOpen(false)
    pending?.onCancel?.()
  }, [])
  const finishNavigation = () => {
    const pending = pendingNavigation.current
    pendingNavigation.current = null
    setIsLeaveConfirmationOpen(false)
    onClose()
    pending?.continuation()
  }
  const requestNavigation = useCallback(
    (continuation: () => void, onCancel?: () => void, intent?: EditorDepartureIntent) => {
      if (intent === "access-loss") return isDirty ? { draft, discard: onClose } : undefined
      cancelNavigation()
      if (isSavingRef.current) {
        onCancel?.()
        return
      }
      if (!isDirty) {
        onClose()
        continuation()
        return
      }
      pendingNavigation.current = { continuation, onCancel }
      setIsLeaveConfirmationOpen(true)
    },
    [cancelNavigation, draft, isDirty, onClose],
  )
  useEffect(() => {
    onNavigationRequestChange?.(requestNavigation)
    return () => onNavigationRequestChange?.(null)
  }, [onNavigationRequestChange, requestNavigation])
  useEffect(
    () => () => {
      pendingNavigation.current?.onCancel?.()
      pendingNavigation.current = null
    },
    [],
  )
  const requestClose = () => {
    if (isSavingRef.current) return
    requestNavigation(() => {})
  }
  const submit = async () => {
    if (isSavingRef.current) return
    isSavingRef.current = true
    setIsSaving(true)
    setSubmitError("")

    try {
      const result = await onSubmit()
      if (result === "applied") finishNavigation()
      else cancelNavigation()
    } catch {
      setSubmitError("We couldn't save this change. Try again.")
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }

  return (
    <>
      <Modal
        description={description}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={isSaving} onClick={requestClose} variant="outline">
              Cancel
            </Button>
            <Button disabled={isSaving || isSubmitDisabled} onClick={submit}>
              {isSaving ? "Saving…" : submitLabel}
            </Button>
          </div>
        }
        onOpenChange={(isOpen) => {
          if (!isOpen) requestClose()
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
          <fieldset disabled={isSaving}>{children}</fieldset>
          {submitError ? (
            <p className="text-sm font-bold text-[var(--destructive)]" role="alert">
              {submitError}
            </p>
          ) : null}
        </div>
      </Modal>
      <Modal
        role="alertdialog"
        contentClassName={submitError ? undefined : "hidden"}
        title="Leave review editing?"
        description="Your review changes have not been submitted."
        open={isLeaveConfirmationOpen}
        onOpenChange={(open) => {
          if (!open && !isSavingRef.current) cancelNavigation()
        }}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button disabled={isSaving} onClick={cancelNavigation} variant="outline">
              Keep editing
            </Button>
            <Button disabled={isSaving} onClick={finishNavigation} variant="destructive">
              Discard and continue
            </Button>
            <Button disabled={isSaving || isSubmitDisabled} onClick={submit}>
              {isSaving ? "Saving…" : "Submit and continue"}
            </Button>
          </div>
        }
      >
        {submitError ? <p role="alert">{submitError}</p> : null}
      </Modal>
    </>
  )
}
