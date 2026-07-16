"use client"

import { useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import type { ClinicReview } from "@/lib/clinic-dashboard/reviews"

export type ReviewActionMode = "appeal" | "history" | "note" | "response"

const actionCopy = {
  appeal: {
    description: "Submit this fixture review for moderation.",
    submit: "Submit appeal",
    title: "Appeal review",
  },
  history: {
    description: "Review the local prototype history for this review.",
    submit: "Close",
    title: "Review history",
  },
  note: {
    description: "Add an internal note that is never shown on the public profile.",
    submit: "Save note",
    title: "Add internal note",
  },
  response: {
    description: "Write the public clinic response shown below the review.",
    submit: "Save response",
    title: "Respond to review",
  },
} as const

export function ReviewActionDialog({
  mode,
  onOpenChange,
  onSubmit,
  open,
  review,
}: {
  mode: ReviewActionMode
  onOpenChange: (open: boolean) => void
  onSubmit: (input: { detail: string; reason: string }) => Promise<void>
  open: boolean
  review?: ClinicReview
}) {
  const [detail, setDetail] = useState(mode === "response" ? (review?.response ?? "") : "")
  const [reason, setReason] = useState("")
  const [detailError, setDetailError] = useState("")
  const [reasonError, setReasonError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [saving, setSaving] = useState(false)
  const detailId = useId()
  const reasonId = useId()
  const detailRef = useRef<HTMLTextAreaElement>(null)
  const reasonRef = useRef<HTMLSelectElement>(null)

  if (!review) return null

  const copy = actionCopy[mode]
  const submit = async () => {
    const trimmedDetail = detail.trim()
    if (mode === "appeal" && !reason) {
      setReasonError("Choose an appeal reason.")
      reasonRef.current?.focus()
      return
    }
    if (mode !== "history" && trimmedDetail.length < 10) {
      setDetailError("Enter at least 10 characters.")
      detailRef.current?.focus()
      return
    }

    setSaving(true)
    setDetailError("")
    setReasonError("")
    setSubmitError("")
    try {
      await onSubmit({ detail: trimmedDetail, reason })
      onOpenChange(false)
    } catch {
      setSubmitError("We couldn't save this change. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      description={copy.description}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {mode === "history" ? (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          ) : (
            <>
              <Button disabled={saving} onClick={() => onOpenChange(false)} variant="outline">
                Cancel
              </Button>
              <Button disabled={saving} onClick={submit}>
                {saving ? "Saving…" : copy.submit}
              </Button>
            </>
          )}
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={copy.title}
    >
      {mode === "history" ? (
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">Status</dt>
            <dd className="mt-1 font-bold">{review.status}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">Revision</dt>
            <dd className="mt-1 font-bold">{review.revision}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
              Clinic response
            </dt>
            <dd className="mt-2 rounded-lg bg-[var(--surface)] p-4">
              {review.response ?? "No public response yet."}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
              Internal notes
            </dt>
            <dd className="mt-2 space-y-2">
              {review.internalNotes.length ? (
                review.internalNotes.map((note, index) => (
                  <p
                    className="rounded-lg border border-[var(--border)] p-3"
                    key={`${review.id}-note-${index}`}
                  >
                    {note}
                  </p>
                ))
              ) : (
                <p className="rounded-lg bg-[var(--surface)] p-4">No internal notes yet.</p>
              )}
            </dd>
          </div>
        </dl>
      ) : (
        <div className="grid gap-5">
          {mode === "appeal" ? (
            <label className="grid gap-2 text-sm font-bold" htmlFor={reasonId}>
              Reason
              <select
                aria-describedby={reasonError ? `${reasonId}-error` : undefined}
                aria-invalid={Boolean(reasonError)}
                aria-label="Reason"
                className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
                id={reasonId}
                onChange={(event) => {
                  setReason(event.target.value)
                  setReasonError("")
                }}
                ref={reasonRef}
                value={reason}
              >
                <option value="">Select a reason…</option>
                <option value="Incorrect clinic">Incorrect clinic</option>
                <option value="Inappropriate content">Inappropriate content</option>
                <option value="Privacy concern">Privacy concern</option>
              </select>
              {reasonError ? (
                <span className="text-xs text-[var(--destructive)]" id={`${reasonId}-error`}>
                  {reasonError}
                </span>
              ) : null}
            </label>
          ) : null}
          <label className="grid gap-2 text-sm font-bold" htmlFor={detailId}>
            {mode === "response" ? "Public response" : mode === "note" ? "Internal note" : "Appeal details"}
            <textarea
              aria-describedby={detailError ? `${detailId}-error` : undefined}
              aria-invalid={Boolean(detailError)}
              aria-label={
                mode === "response" ? "Public response" : mode === "note" ? "Internal note" : "Appeal details"
              }
              className="min-h-36 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 font-normal"
              id={detailId}
              onChange={(event) => {
                setDetail(event.target.value)
                setDetailError("")
              }}
              placeholder={
                mode === "response"
                  ? "Thank the patient and address their feedback…"
                  : mode === "note"
                    ? "Add context for the clinic team…"
                    : "Explain why this review should be assessed…"
              }
              ref={detailRef}
              value={detail}
            />
            {detailError ? (
              <span className="text-xs text-[var(--destructive)]" id={`${detailId}-error`}>
                {detailError}
              </span>
            ) : null}
          </label>
          {submitError ? (
            <p className="text-sm font-bold text-[var(--destructive)]" role="alert">
              {submitError}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  )
}
