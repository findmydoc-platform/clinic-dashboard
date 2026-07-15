import { forwardRef, type ComponentPropsWithoutRef } from "react"
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Eye,
  FileCheck2,
  MessageSquare,
  MousePointerClick,
} from "lucide-react"
import { RatingStars } from "@/components/atoms/DashboardPrimitives"
import { cn } from "@/lib/utils"

const metricIcons = {
  completion: BadgeCheck,
  contacts: MessageSquare,
  impressions: Eye,
  inquiries: FileCheck2,
  views: MousePointerClick,
} as const

export const SurfaceCard = forwardRef<HTMLElement, ComponentPropsWithoutRef<"section">>(function SurfaceCard(
  { className, ...props },
  ref,
) {
  return (
    <section
      className={cn("rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm", className)}
      ref={ref}
      {...props}
    />
  )
})

export function MetricCard({
  metric,
}: {
  metric: { delta?: string; id: string; label: string; note?: string; progress?: number; value: string }
}) {
  const Icon = metricIcons[metric.id as keyof typeof metricIcons] ?? BadgeCheck
  const negative = metric.delta?.startsWith("-")
  const Trend = negative ? ArrowDown : ArrowUp

  return (
    <SurfaceCard className="min-w-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
          {metric.label}
        </span>
        <span className="rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,white)] p-2 text-[var(--primary)]">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <strong className="text-2xl tracking-tight">{metric.value}</strong>
        {metric.delta ? (
          <span
            className={cn(
              "inline-flex items-center text-xs font-bold",
              negative ? "text-[var(--destructive)]" : "text-[var(--primary)]",
            )}
          >
            <Trend aria-hidden="true" className="size-3" /> {metric.delta}
          </span>
        ) : null}
      </div>
      {typeof metric.progress === "number" ? (
        <div
          aria-label={`${metric.label}: ${metric.progress}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={metric.progress}
          className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface)]"
          role="progressbar"
        >
          <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${metric.progress}%` }} />
        </div>
      ) : null}
      {metric.note ? <p className="mt-2 text-xs text-[var(--foreground)]">{metric.note}</p> : null}
    </SurfaceCard>
  )
}

export function RatingSummary({ count, value }: { count: number; value: number }) {
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
