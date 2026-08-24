import { FileClock, Flag, MessageSquareReply, ShieldCheck } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RatingStars } from "@/components/ui/rating-stars"
import type { ClinicReviewRecord } from "../../model/review-source"
import {
  canSubmitReviewResponse,
  reviewAppealReasonLabel,
  reviewAppealStatusLabel,
  reviewPublicMeasureLabel,
  reviewResponseStatusLabel,
} from "../../model/review-source"

type Props = Readonly<{
  onAppealOpen: (reviewId: string) => void
  onHistoryOpen: (reviewId: string) => void
  onResponseOpen: (reviewId: string) => void
  review: ClinicReviewRecord
  showManagement: boolean
}>

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value),
  )
}

export function ReviewCard({ onAppealOpen, onHistoryOpen, onResponseOpen, review, showManagement }: Props) {
  const isUnavailable = review.withdrawalState === "withdrawn" || review.publicMeasure === "removed"
  const canSubmitResponse = canSubmitReviewResponse(review)
  const responseLabel = review.response?.pending ? "Edit pending response" : "Respond"
  return (
    <Card
      aria-label={`Review by ${review.author}, ${review.treatment.label}`}
      className="p-5 sm:p-6"
      data-review-id={review.id}
      tabIndex={-1}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar initials={review.initials} />
          <div>
            <h2 className="font-bold">{review.author}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--foreground)]">
              <RatingStars value={review.rating} />
              <time dateTime={review.reviewDate}>{formatDate(review.reviewDate)}</time>
              <span>{review.treatment.label}</span>
            </div>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--foreground)]">
          <ShieldCheck aria-hidden="true" className="size-4" /> Approved review
        </span>
      </div>

      <div className="mt-5">
        {isUnavailable ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-bold">
              {review.withdrawalState === "withdrawn" ? "Review withdrawn" : "Review text removed"}
            </p>
            <p className="mt-1 text-sm text-[var(--foreground)]">
              The original review text is not available to the clinic.
            </p>
          </div>
        ) : review.publicMeasure === "placeholder" ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-bold">Review text replaced</p>
            <p className="mt-1 text-sm text-[var(--foreground)]">
              {review.publicNotice ?? "The written content is not publicly available."}
            </p>
          </div>
        ) : (
          <p className="text-sm leading-6">{review.publicText}</p>
        )}
        {review.publicMeasure !== "none" &&
        review.publicMeasure !== "removed" &&
        review.publicMeasure !== "placeholder" ? (
          <div className="mt-4 border-l-2 border-[var(--primary)] pl-4 text-sm">
            <strong>{reviewPublicMeasureLabel(review.publicMeasure)}</strong>
            {review.publicNotice ? (
              <p className="mt-1 text-[var(--foreground)]">{review.publicNotice}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {review.response ? (
        <section
          aria-label={`Clinic response for ${review.author}, ${review.treatment.label}`}
          className="mt-5 space-y-3 border-l-4 border-[var(--primary)] bg-[var(--surface)] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold">Clinic response</h3>
            <span className="text-xs font-bold text-[var(--foreground)]">
              {reviewResponseStatusLabel(review.response.status)}
            </span>
          </div>
          {review.response.published ? (
            <p className="text-sm leading-6">{review.response.published.body}</p>
          ) : null}
          {review.response.pending ? (
            <div className="border-t border-[var(--border)] pt-3">
              <p className="text-xs font-bold text-[var(--foreground)]">
                Pending revision · submitted {formatDate(review.response.pending.submittedAt)}
              </p>
              <p className="mt-2 text-sm leading-6">{review.response.pending.body}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {review.appeal ? (
        <section aria-label="Review appeal" className="mt-5 rounded-lg border border-[var(--border)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold">Appeal · {reviewAppealReasonLabel(review.appeal.reason)}</h3>
            <span className="text-xs font-bold text-[var(--foreground)]">
              {reviewAppealStatusLabel(review.appeal.status)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6">{review.appeal.details}</p>
          {review.appeal.decisionReason ? (
            <p className="mt-3 border-t border-[var(--border)] pt-3 text-sm text-[var(--foreground)]">
              Decision: {review.appeal.decisionReason}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="mt-5 flex flex-col gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:flex-wrap">
        {showManagement && canSubmitResponse ? (
          <Button
            className="sm:w-auto"
            onClick={() => onResponseOpen(review.id)}
            size="small"
            variant={review.response ? "outline" : "primary"}
          >
            <MessageSquareReply aria-hidden="true" className="size-4" />
            {responseLabel}
          </Button>
        ) : null}
        {showManagement && !review.appeal ? (
          <Button className="sm:w-auto" onClick={() => onAppealOpen(review.id)} size="small" variant="ghost">
            <Flag aria-hidden="true" className="size-4" />
            Submit appeal
          </Button>
        ) : null}
        <Button className="sm:w-auto" onClick={() => onHistoryOpen(review.id)} size="small" variant="ghost">
          <FileClock aria-hidden="true" className="size-4" />
          View history
        </Button>
      </div>
    </Card>
  )
}
