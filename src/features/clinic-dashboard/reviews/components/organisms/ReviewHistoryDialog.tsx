"use client"

import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import {
  reviewAppealStatusLabel,
  reviewPublicMeasureLabel,
  reviewResponseStatusLabel,
} from "../../model/review-source"
import { isSupersededResponseHistoryEntry } from "../../model/review-history"
import type { ReviewAppealHistoryEntry, ReviewResponseHistoryEntry } from "../../model/review-source"
import type { ReviewDialogModel } from "../../model/reviews-view-model"

type HistoryDialog = Extract<ReviewDialogModel, { kind: "history" }>

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function responseActionLabel(action: ReviewResponseHistoryEntry["action"]) {
  const labels = {
    approved: "Response approved",
    blocked: "Response blocked",
    pending_edited: "Pending response edited",
    rejected: "Response rejected",
    revision_submitted: "Revision submitted",
    seeded: "Response initialized",
    submitted: "Response submitted",
  } as const
  return labels[action]
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
            <h3 className="font-bold">Response history</h3>
            {history.response.length ? (
              <ol className="mt-3 space-y-3">
                {history.response.map((entry, index) => {
                  const isCurrent = index === 0
                  const isSuperseded = isSupersededResponseHistoryEntry(history.response, index)
                  return (
                    <li
                      aria-current={isCurrent ? "true" : undefined}
                      className={`rounded-lg bg-[var(--surface)] p-4 ${
                        isCurrent ? "border-l-4 border-[var(--accent)]" : "border-l-2 border-[var(--border)]"
                      }`}
                      key={entry.id}
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <strong>{responseActionLabel(entry.action)}</strong>
                        <time className="text-xs text-[var(--foreground)]" dateTime={entry.recordedAt}>
                          {formatDate(entry.recordedAt)}
                        </time>
                      </div>
                      <p className="mt-1 text-xs font-bold text-[var(--foreground)]">
                        {isCurrent
                          ? `Current state · ${reviewResponseStatusLabel(entry.status)}`
                          : isSuperseded
                            ? `Superseded · ${reviewResponseStatusLabel(entry.status)} at the time`
                            : `Historical state · ${reviewResponseStatusLabel(entry.status)}`}
                      </p>
                      {entry.publishedBody ? (
                        <p className="mt-2 text-sm">
                          {isCurrent ? "Current published response" : "Published response at this point"}:{" "}
                          {entry.publishedBody}
                        </p>
                      ) : null}
                      {entry.pendingBody ? (
                        <p className="mt-2 text-sm">
                          {isCurrent
                            ? "Current pending response"
                            : isSuperseded
                              ? "Previous pending response"
                              : "Pending response at this point"}
                          : {entry.pendingBody}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-[var(--foreground)]">No response history.</p>
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
