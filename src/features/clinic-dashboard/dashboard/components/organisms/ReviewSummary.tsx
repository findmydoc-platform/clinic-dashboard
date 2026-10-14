import { MessageSquareReply } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RatingStars } from "@/components/ui/rating-stars"
import type { DashboardViewModel } from "../../model/dashboard-view-model"
import type { DashboardReviewSummary } from "../../model/dashboard-overview"

type ReviewSummaryProps = Readonly<{
  onOpen: () => void
}> &
  (
    | Readonly<{
        rating: DashboardViewModel["rating"]
        reviewActivity: string
      }>
    | Readonly<{ summary: DashboardReviewSummary }>
  )

export function ReviewSummary({ onOpen, ...content }: ReviewSummaryProps) {
  if ("summary" in content) {
    const { summary } = content
    return (
      <Card className="p-5">
        <h2 className="text-xl font-bold text-[var(--secondary)]">Reviews</h2>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <strong className="text-3xl">{summary.average}</strong>
          {summary.rating !== null ? <RatingStars value={summary.rating} /> : null}
        </div>
        <p className="mt-2 text-sm">{summary.count} public reviews</p>
        <p className="mt-2 text-xs text-[var(--foreground)]">{summary.detail}</p>
        <Button className="mt-5 w-full" onClick={onOpen} variant="outline">
          <MessageSquareReply aria-hidden="true" className="size-4" /> View reviews
        </Button>
      </Card>
    )
  }
  const { rating, reviewActivity } = content
  return (
    <Card className="p-5">
      <h2 className="text-xl font-bold text-[var(--secondary)]">Reviews</h2>
      <div className="mt-5 flex items-center gap-3">
        <strong className="text-4xl">{rating.value}</strong>
        <div>
          <RatingStars value={rating.value} />
          <div className="text-xs text-[var(--foreground)]">
            ({rating.count.toLocaleString("en-US")} total reviews)
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm font-bold text-[var(--primary)]">{reviewActivity}</p>
      <p className="mt-1 text-xs font-bold text-[var(--foreground)]">
        {rating.pendingResponses} response pending
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {rating.categories.map((category) => (
          <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-bold" key={category}>
            {category}
          </span>
        ))}
      </div>
      <Button className="mt-5 w-full" onClick={onOpen} variant="outline">
        <MessageSquareReply aria-hidden="true" className="size-4" />
        View reviews
      </Button>
    </Card>
  )
}
