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
    <Card className="flex h-full min-w-0 flex-col" id={id}>
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
      <div className="flex flex-1 flex-col p-5">
        <DashboardMetricChart
          key={`${period}-${metric.id}`}
          description={metric.description}
          points={metric.points}
          valueLabels={metric.valueLabels}
        />
        <dl className="mt-auto grid grid-cols-2 border-t border-[var(--border)] pt-4 sm:grid-cols-5">
          {metric.summary.map((item) => (
            <div
              aria-label={`${item.label}${item.isSelected ? ", selected metric" : ""}`}
              className={cn(
                "flex min-h-20 flex-col items-center justify-center border-t-2 px-2 text-center last:col-span-2 sm:last:col-span-1",
                item.isSelected ? "border-[var(--accent)]" : "border-transparent",
              )}
              data-dashboard-summary-item
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
