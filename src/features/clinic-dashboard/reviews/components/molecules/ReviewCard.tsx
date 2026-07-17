import { FileClock, Flag, Info, MessageSquareReply, Pencil, StickyNote } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RatingStars } from "@/components/ui/rating-stars"
import { cn } from "@/lib/utils"
import type { ClinicReview } from "../../model/review"

type ReviewCardProps = Readonly<{
  onAppealOpen: (reviewId: string) => void
  onHistoryOpen: (reviewId: string) => void
  onNoteOpen: (reviewId: string) => void
  onResponseOpen: (reviewId: string) => void
  review: ClinicReview
  showManagement: boolean
}>

export function ReviewCard({
  onAppealOpen,
  onHistoryOpen,
  onNoteOpen,
  onResponseOpen,
  review,
  showManagement,
}: ReviewCardProps) {
  return (
    <Card
      className={cn(
        "p-5 sm:p-6",
        review.status === "Under review" &&
          "border-[color-mix(in_srgb,var(--destructive)_45%,var(--background))] bg-[color-mix(in_srgb,var(--destructive)_6%,var(--background))]",
      )}
      data-review-status={review.status}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar initials={review.initials} />
          <div>
            <h2 className="font-bold">{review.author}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <RatingStars value={review.rating} />
              <span className="text-xs text-[var(--foreground)]">{review.age}</span>
            </div>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            review.status === "Answered"
              ? "bg-[color-mix(in_srgb,var(--accent)_28%,var(--background))]"
              : review.status === "Open"
                ? "bg-[var(--warning)]"
                : "bg-[var(--error)]",
          )}
        >
          {review.status}
        </span>
      </div>
      <span className="mt-5 inline-block rounded bg-[var(--surface)] px-2 py-1 text-[10px] font-bold tracking-wide uppercase">
        {review.treatment}
      </span>
      <p className="mt-4 text-sm leading-6">{review.body}</p>
      {review.response ? (
        <div className="mt-5 border-l-4 border-[var(--primary)] bg-[var(--surface)] p-4">
          <div className="text-xs font-bold text-[var(--foreground)]">Clinic response</div>
          <p className="mt-2 text-sm italic">{review.response}</p>
        </div>
      ) : null}
      {review.notice ? (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--destructive)_35%,var(--background))] bg-[var(--error)] p-4 text-sm">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{review.notice}</span>
        </div>
      ) : null}
      {showManagement ? (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
          {review.status === "Under review" ? (
            <Button disabled size="small" variant="ghost">
              <MessageSquareReply aria-hidden="true" className="size-4" /> Responses locked
            </Button>
          ) : (
            <Button
              onClick={() => onResponseOpen(review.id)}
              size="small"
              variant={review.status === "Open" ? "primary" : "ghost"}
            >
              {review.status === "Answered" ? (
                <Pencil aria-hidden="true" className="size-4" />
              ) : (
                <MessageSquareReply aria-hidden="true" className="size-4" />
              )}
              {review.status === "Answered" ? "Edit response" : "Respond"}
            </Button>
          )}
          {review.status !== "Under review" ? (
            <Button onClick={() => onNoteOpen(review.id)} size="small" variant="ghost">
              <StickyNote aria-hidden="true" className="size-4" /> Internal note
            </Button>
          ) : null}
          {review.status === "Open" ? (
            <Button onClick={() => onAppealOpen(review.id)} size="small" variant="ghost">
              <Flag aria-hidden="true" className="size-4" /> Appeal
            </Button>
          ) : null}
          <Button onClick={() => onHistoryOpen(review.id)} size="small" variant="ghost">
            <FileClock aria-hidden="true" className="size-4" /> History
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
