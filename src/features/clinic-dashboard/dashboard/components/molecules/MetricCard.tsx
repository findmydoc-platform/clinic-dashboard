import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Eye,
  FileCheck2,
  MessageSquare,
  MousePointerClick,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DashboardMetric, DashboardSelectableMetricId } from "../../model/reporting"

const metricIcons = {
  completion: BadgeCheck,
  contacts: MessageSquare,
  impressions: Eye,
  inquiries: FileCheck2,
  views: MousePointerClick,
} as const

type MetricCardProps = Readonly<{
  metric: DashboardMetric
  selection?: Readonly<{
    controlsId: string
    isSelected: boolean
    metricId: DashboardSelectableMetricId
    onSelect: (metricId: DashboardSelectableMetricId) => void
  }>
}>

export function MetricCard({ metric, selection }: MetricCardProps) {
  const Icon = metricIcons[metric.id as keyof typeof metricIcons] ?? BadgeCheck
  const negative = metric.delta?.startsWith("-")
  const Trend = negative ? ArrowDown : ArrowUp

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
          {metric.label}
        </span>
        <span className="p-1 text-[var(--primary)]">
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
    </>
  )

  return (
    <Card
      className={cn(
        "min-w-0 shadow-none transition-colors",
        selection?.isSelected &&
          "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--background))]",
      )}
    >
      {selection ? (
        <button
          aria-controls={selection.controlsId}
          aria-pressed={selection.isSelected}
          className="h-full min-h-11 w-full rounded-xl p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          onClick={() => selection.onSelect(selection.metricId)}
          type="button"
        >
          {content}
        </button>
      ) : (
        <div className="p-4">{content}</div>
      )}
    </Card>
  )
}
