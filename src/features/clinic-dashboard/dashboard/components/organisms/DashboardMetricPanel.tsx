import { ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DashboardMetricSelection } from "../../model/dashboard-metric-selection"
import type { DashboardReportingPeriod } from "../../model/reporting"
import { DashboardMetricChart } from "../molecules/DashboardMetricChart"

type DashboardMetricPanelProps = Readonly<{
  canDownloadProfileViews: boolean
  id: string
  metric: DashboardMetricSelection
  onDownloadProfileViews: () => void
  period: DashboardReportingPeriod
}>

export function DashboardMetricPanel({
  canDownloadProfileViews,
  id,
  metric,
  onDownloadProfileViews,
  period,
}: DashboardMetricPanelProps) {
  const showDownload = canDownloadProfileViews && metric.id === "views"

  return (
    <Card className="min-w-0" id={id}>
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-[var(--secondary)]">{metric.title}</h2>
          <p className="mt-1 text-xs font-bold text-[var(--primary)]">{metric.comparison}</p>
          <p className="mt-1 text-xs text-[var(--foreground)]">Prototype data — not live analytics.</p>
        </div>
        {showDownload ? (
          <Button
            aria-label="Download profile views"
            className="shrink-0"
            onClick={onDownloadProfileViews}
            size="small"
            variant="outline"
          >
            <ArrowDown aria-hidden="true" className="size-4" />
            Download CSV
          </Button>
        ) : null}
      </div>
      <div className="p-5">
        <DashboardMetricChart
          key={`${period}-${metric.id}`}
          description={metric.description}
          points={metric.points}
          valueLabel={metric.valueLabel}
        />
        <dl className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-4">
          {metric.summary.map((item) => (
            <div
              aria-label={`${item.label}${item.isSelected ? ", selected metric" : ""}`}
              className={cn(
                "border-l-2 pl-3",
                item.isSelected ? "border-[var(--accent)]" : "border-transparent",
              )}
              data-selected-summary={item.isSelected || undefined}
              key={item.id}
            >
              <dt
                className={cn(
                  "text-xs",
                  item.isSelected ? "font-bold text-[var(--secondary)]" : "text-[var(--foreground)]",
                )}
              >
                {item.label}
              </dt>
              <dd className="font-bold text-[var(--primary)]">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  )
}
