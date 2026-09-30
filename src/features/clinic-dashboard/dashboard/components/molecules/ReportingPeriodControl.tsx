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
    <div aria-label="Reporting period" className="flex flex-wrap gap-2" role="group">
      {clinicDashboardReportingPeriodDays.map((periodDays) => {
        const selected = periodDays === value

        return (
          <Button
            aria-pressed={selected}
            className={cn("min-h-11 px-4", selected && "shadow-sm")}
            disabled={disabled}
            key={periodDays}
            onClick={() => onValueChange(periodDays)}
            size="small"
            variant={selected ? "accent" : "outline"}
          >
            {periodDays} days
          </Button>
        )
      })}
    </div>
  )
}
