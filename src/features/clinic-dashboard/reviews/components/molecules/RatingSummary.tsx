import { RatingStars } from "@/components/ui/rating-stars"

type RatingSummaryProps = Readonly<{
  count: number
  value: number
}>

export function RatingSummary({ count, value }: RatingSummaryProps) {
  return (
    <div className="flex flex-col items-center justify-center p-7 text-center">
      <strong className="text-5xl tracking-tight text-[var(--secondary)]">{value.toFixed(1)}</strong>
      <RatingStars className="mt-3" value={value} />
      <p className="mt-3 text-sm text-[var(--foreground)]">
        Based on {count.toLocaleString("en-US")} reviews
      </p>
    </div>
  )
}
