import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  clinicDashboardReportingPeriodDays,
  type ClinicDashboardReportingPeriodDays,
} from "../../model/clinic-dashboard-reporting"

type ReportingPeriodControlProps = Readonly<{
  disabled?: boolean
  onValueChange: (periodDays: ClinicDashboardReportingPeriodDays) => void
  value: ClinicDashboardReportingPeriodDays
}>

export function ReportingPeriodControl({
  disabled = false,
  onValueChange,
  value,
}: ReportingPeriodControlProps) {
  return (
    <div
      aria-label="Reporting period"
      className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm"
      role="group"
    >
      {clinicDashboardReportingPeriodDays.map((periodDays) => {
        const selected = periodDays === value

        return (
          <Button
            aria-pressed={selected}
            className={cn("h-11 min-h-11 rounded-lg px-3 sm:h-8 sm:min-h-8", selected && "shadow-sm")}
            disabled={disabled}
            key={periodDays}
            onClick={() => onValueChange(periodDays)}
            size="small"
            variant={selected ? "accent" : "ghost"}
          >
            {periodDays} days
          </Button>
        )
      })}
    </div>
  )
}
