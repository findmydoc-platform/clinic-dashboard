import { ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { DashboardReportingPeriod, DashboardReportingSnapshot } from "../../model/reporting"
import { ProfileViewsChart } from "../molecules/ProfileViewsChart"

type ProfileViewsPanelProps = Readonly<{
  canDownload: boolean
  chart: DashboardReportingSnapshot["chart"]
  onDownload: () => void
  period: DashboardReportingPeriod
}>

export function ProfileViewsPanel({ canDownload, chart, onDownload, period }: ProfileViewsPanelProps) {
  return (
    <Card className="min-w-0">
      <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
        <div>
          <h2 className="text-xl font-bold text-[var(--secondary)]">Profile views over time</h2>
          <p className="mt-1 text-xs font-bold text-[var(--primary)]">{chart.comparison}</p>
        </div>
        {canDownload ? (
          <Button aria-label="Download profile views" onClick={onDownload} size="small" variant="outline">
            <ArrowDown aria-hidden="true" className="size-4" />
            Download CSV
          </Button>
        ) : null}
      </div>
      <div className="p-5">
        <ProfileViewsChart key={period} description={chart.description} points={chart.points} />
        <dl className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-4">
          {chart.summary.map((item) => (
            <div key={item.label}>
              <dt className="text-xs text-[var(--foreground)]">{item.label}</dt>
              <dd className="font-bold text-[var(--primary)]">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  )
}
