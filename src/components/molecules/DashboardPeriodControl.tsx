import { Button } from "@/components/ui/button"
import { dashboardReportingPeriods, type DashboardReportingPeriod } from "@/lib/clinic-dashboard/reporting"
import { cn } from "@/lib/utils"

type DashboardPeriodControlProps = Readonly<{
  onChange: (period: DashboardReportingPeriod) => void
  period: DashboardReportingPeriod
}>

export function DashboardPeriodControl({ onChange, period }: DashboardPeriodControlProps) {
  return (
    <div
      aria-label="Reporting period"
      className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm"
      role="group"
    >
      {dashboardReportingPeriods.map((option) => {
        const selected = option === period

        return (
          <Button
            aria-pressed={selected}
            className={cn("h-11 min-h-11 rounded-lg px-3 sm:h-8 sm:min-h-8", selected && "shadow-sm")}
            key={option}
            onClick={() => onChange(option)}
            size="small"
            variant={selected ? "primary" : "ghost"}
          >
            {option}
          </Button>
        )
      })}
    </div>
  )
}
