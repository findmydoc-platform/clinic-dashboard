"use client"

import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import {
  reviewAppealStatusLabel,
  reviewPublicMeasureLabel,
  reviewResponseStatusLabel,
} from "../../model/review-source"
import { isEditedResponseHistoryEntry } from "../../model/review-history"
import type { ReviewAppealHistoryEntry, ReviewResponseStatus } from "../../model/review-source"
import type { ReviewDialogModel } from "../../model/reviews-view-model"

type HistoryDialog = Extract<ReviewDialogModel, { kind: "history" }>

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function responseTitle(status: ReviewResponseStatus) {
  const labels = {
    approved: "Response approved",
    blocked: "Response blocked",
    pending: "Response submitted",
    rejected: "Response rejected",
  } as const
  return labels[status]
}

function appealActionLabel(action: ReviewAppealHistoryEntry["action"]) {
  const labels = {
    dismissed: "Appeal dismissed",
    reviewed: "Appeal reviewed",
    seeded: "Appeal initialized",
    submitted: "Appeal submitted",
    under_review: "Appeal moved under review",
    upheld: "Appeal upheld",
  } as const
  return labels[action]
}

export function ReviewHistoryDialog({
  dialog,
  onClose,
  onLoadOlder,
}: Readonly<{
  dialog: HistoryDialog
  onClose: () => void
  onLoadOlder: () => void
}>) {
  const history = dialog.history
  const currentResponse = history?.response[0]
  const currentResponseBody = currentResponse?.pendingBody ?? currentResponse?.publishedBody
  return (
    <Modal
      description="Publication, clinic response, and appeal changes are shown independently."
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
          {history?.publication.hasNextPage ? (
            <Button disabled={dialog.isLoadingOlder} onClick={onLoadOlder}>
              {dialog.isLoadingOlder ? "Loading…" : "Load older history"}
            </Button>
          ) : null}
        </div>
      }
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      open
      title="Review history"
    >
      {dialog.isLoading ? <p className="text-sm text-[var(--foreground)]">Loading review history…</p> : null}
      {dialog.error ? (
        <p className="text-sm font-bold text-[var(--destructive)]" role="alert">
          {dialog.error}
        </p>
      ) : null}
      {history ? (
        <div className="space-y-7">
          <section>
            <h3 className="font-bold">Publication history</h3>
            <ol className="mt-3 space-y-3">
              {history.publication.entries.map((entry, index) => {
                const isCurrent = index === 0
                return (
                  <li
                    aria-current={isCurrent ? "true" : undefined}
                    className={
                      isCurrent
                        ? "border-l-4 border-[var(--accent)] pl-4"
                        : "border-l-2 border-[var(--border)] pl-4"
                    }
                    key={entry.id}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong>
                        {entry.withdrawalState === "withdrawn"
                          ? "Review withdrawn"
                          : reviewPublicMeasureLabel(entry.publicMeasure)}
                      </strong>
                      <time className="text-xs text-[var(--foreground)]" dateTime={entry.recordedAt}>
                        {formatDate(entry.recordedAt)}
                      </time>
                    </div>
                    <p className="mt-1 text-xs font-bold text-[var(--foreground)]">
                      {isCurrent ? "Current publication state" : "Historical publication state"}
                    </p>
                    {entry.withdrawalState !== "withdrawn" &&
                    entry.publicMeasure !== "removed" &&
                    entry.publicText ? (
                      <p className="mt-2 text-sm leading-6">{entry.publicText}</p>
                    ) : null}
                    {entry.publicNotice ? (
                      <p className="mt-1 text-sm text-[var(--foreground)]">{entry.publicNotice}</p>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </section>
          <section>
            <h3 className="font-bold">Clinic response</h3>
            {currentResponse ? (
              <div
                aria-current="true"
                className="mt-3 rounded-lg border-l-4 border-[var(--accent)] bg-[var(--surface)] p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong>{responseTitle(currentResponse.status)}</strong>
                  <p className="text-xs text-[var(--foreground)]">
                    <time dateTime={currentResponse.recordedAt}>
                      {formatDate(currentResponse.recordedAt)}
                    </time>
                    {isEditedResponseHistoryEntry(currentResponse) ? <span> · Edited</span> : null}
                  </p>
                </div>
                <p className="mt-1 text-xs font-bold text-[var(--foreground)]">
                  {reviewResponseStatusLabel(currentResponse.status)}
                </p>
                {currentResponseBody ? <p className="mt-2 text-sm">{currentResponseBody}</p> : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--foreground)]">No clinic response.</p>
            )}
          </section>
          <section>
            <h3 className="font-bold">Appeal history</h3>
            {history.appeal.length ? (
              <ol className="mt-3 space-y-3">
                {history.appeal.map((entry, index) => {
                  const isCurrent = index === 0
                  return (
                    <li
                      aria-current={isCurrent ? "true" : undefined}
                      className={`rounded-lg bg-[var(--surface)] p-4 ${
                        isCurrent ? "border-l-4 border-[var(--accent)]" : "border-l-2 border-[var(--border)]"
                      }`}
                      key={entry.id}
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <strong>{appealActionLabel(entry.action)}</strong>
                        <time className="text-xs text-[var(--foreground)]" dateTime={entry.recordedAt}>
                          {formatDate(entry.recordedAt)}
                        </time>
                      </div>
                      <p className="mt-1 text-xs font-bold text-[var(--foreground)]">
                        {isCurrent
                          ? `Current state · ${reviewAppealStatusLabel(entry.status)}`
                          : `Historical state · ${reviewAppealStatusLabel(entry.status)}`}
                      </p>
                      {entry.decisionReason ? (
                        <p className="mt-2 text-sm text-[var(--foreground)]">
                          Decision reason: {entry.decisionReason}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-[var(--foreground)]">No appeal history.</p>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  )
}
