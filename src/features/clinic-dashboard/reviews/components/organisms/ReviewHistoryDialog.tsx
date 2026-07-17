"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import type { ReviewAppealEvent } from "../../model/appeal-case"
import type { ClinicReview } from "../../model/review"
import type { ReviewMutationResult } from "../../model/reviews-view-model"

type ReviewHistoryDialogProps = Readonly<{
  onClose: () => void
  onMarkAppealUnderReview: () => Promise<ReviewMutationResult>
  review: ClinicReview
}>

function formatPrototypeTimestamp(timestamp: string) {
  return timestamp.replace("T", " ").replace(".000Z", " UTC")
}

function getAppealEventLabel(event: ReviewAppealEvent) {
  return event.type === "appeal-submitted" ? "Appeal case submitted" : "Status changed to under review"
}

export function ReviewHistoryDialog({ onClose, onMarkAppealUnderReview, review }: ReviewHistoryDialogProps) {
  const [isUpdatingAppeal, setIsUpdatingAppeal] = useState(false)
  const [updateError, setUpdateError] = useState("")
  const appealCase = review.appealCase

  const markAppealUnderReview = async () => {
    setIsUpdatingAppeal(true)
    setUpdateError("")

    try {
      await onMarkAppealUnderReview()
    } catch {
      setUpdateError("We couldn't update this local appeal preview. Try again.")
    } finally {
      setIsUpdatingAppeal(false)
    }
  }

  return (
    <Modal
      description="Review the local prototype history for this review."
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button disabled={isUpdatingAppeal} onClick={onClose} variant="outline">
            Close
          </Button>
          {appealCase?.status === "submitted" ? (
            <Button disabled={isUpdatingAppeal} onClick={markAppealUnderReview}>
              {isUpdatingAppeal ? "Updating local preview…" : "Mark as under review"}
            </Button>
          ) : null}
        </div>
      }
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
      open
      title="Review history"
    >
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
            Published clinic response
          </dt>
          <dd className="mt-2 rounded-lg bg-[var(--surface)] p-4">
            {review.publishedResponse ?? "No published response yet."}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
            Pending moderation
          </dt>
          <dd className="mt-2 rounded-lg bg-[var(--surface)] p-4">
            {review.pendingResponse ? (
              <div className="space-y-2">
                <p>{review.pendingResponse.response}</p>
                <time
                  className="block text-xs text-[var(--foreground)]"
                  dateTime={review.pendingResponse.submittedAt}
                >
                  Saved {formatPrototypeTimestamp(review.pendingResponse.submittedAt)}
                </time>
              </div>
            ) : (
              "No response pending moderation."
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">Appeal case</dt>
          <dd className="mt-2">
            {appealCase ? (
              <div className="space-y-5 rounded-lg border border-[var(--border)] p-4">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold text-[var(--foreground)]">Reference</dt>
                    <dd className="mt-1 font-mono text-xs break-all">{appealCase.reference}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-[var(--foreground)]">Case status</dt>
                    <dd className="mt-1 font-bold">
                      {appealCase.status === "submitted" ? "Submitted" : "Under review"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-bold text-[var(--foreground)]">Reason</dt>
                    <dd className="mt-1">{appealCase.reason}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-bold text-[var(--foreground)]">Details</dt>
                    <dd className="mt-1 leading-6">{appealCase.detail}</dd>
                  </div>
                </dl>
                <div>
                  <h3 className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
                    Case timeline
                  </h3>
                  <ol className="mt-3 space-y-3">
                    {appealCase.events.map((event) => (
                      <li
                        className="border-l-2 border-[var(--border)] pl-4"
                        data-appeal-event-type={event.type}
                        key={event.id}
                      >
                        <p className="font-bold">{getAppealEventLabel(event)}</p>
                        <time
                          className="mt-1 block text-xs text-[var(--foreground)]"
                          dateTime={event.occurredAt}
                        >
                          {formatPrototypeTimestamp(event.occurredAt)}
                        </time>
                        <p className="mt-1 font-mono text-xs break-all text-[var(--foreground)]">
                          {event.id}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : (
              <p className="rounded-lg bg-[var(--surface)] p-4">No appeal case has been opened.</p>
            )}
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
      {updateError ? (
        <p className="mt-4 text-sm font-bold text-[var(--destructive)]" role="alert">
          {updateError}
        </p>
      ) : null}
    </Modal>
  )
}
