import { Button } from "@/components/ui/button"
import { dashboardReportingPeriods } from "../../model/reporting"
import { cn } from "@/lib/utils"
import type { DashboardReportingPeriod } from "../../model/reporting"

type DashboardPeriodControlProps = Readonly<{
  onValueChange: (period: DashboardReportingPeriod) => void
  value: DashboardReportingPeriod
}>

export function DashboardPeriodControl({ onValueChange, value }: DashboardPeriodControlProps) {
  return (
    <div
      aria-label="Reporting period"
      className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm"
      role="group"
    >
      {dashboardReportingPeriods.map((option) => {
        const selected = option === value

        return (
          <Button
            aria-pressed={selected}
            className={cn("h-11 min-h-11 rounded-lg px-3 sm:h-8 sm:min-h-8", selected && "shadow-sm")}
            key={option}
            onClick={() => onValueChange(option)}
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
