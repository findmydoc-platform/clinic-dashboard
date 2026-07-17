import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

type RatingStarsProps = Readonly<{
  className?: string
  value: number
}>

export function RatingStars({ value, className }: RatingStarsProps) {
  const normalizedValue = Math.min(5, Math.max(0, value))

  return (
    <span aria-label={`${value} out of 5 stars`} className={cn("inline-flex gap-0.5", className)} role="img">
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.round(Math.min(100, Math.max(0, (normalizedValue - index) * 100)))
        const state = fill === 100 ? "full" : fill > 0 ? "partial" : "empty"

        return (
          <span className="relative size-4 text-[var(--muted-foreground)]" key={index}>
            <Star aria-hidden="true" className="absolute inset-0 size-4" />
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 overflow-hidden text-[var(--primary)]"
              data-star-fill={fill}
              data-star-state={state}
              style={{ width: `${fill}%` }}
            >
              <Star className="size-4 fill-current" />
            </span>
          </span>
        )
      })}
    </span>
  )
}
