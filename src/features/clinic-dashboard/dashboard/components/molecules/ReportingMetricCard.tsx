import { Card } from "@/components/ui/card"
import { ReportingInformation } from "./ReportingInformation"

type ReportingMetricCardProps = Readonly<{
  comparison?: string
  detail?: string
  information?: string
  label: string
  value: string
  progress?: number
}>

export function ReportingMetricCard({
  comparison,
  detail,
  information,
  label,
  value,
  progress,
}: ReportingMetricCardProps) {
  return (
    <Card className="min-w-0 shadow-none">
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">{label}</p>
          {information ? <ReportingInformation label={label}>{information}</ReportingInformation> : null}
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--secondary)]">{value}</p>
        {progress !== undefined ? (
          <div
            aria-label={`${label}: ${progress}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface)]"
            role="progressbar"
          >
            <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
        {comparison ? <p className="mt-2 text-xs font-medium text-[var(--primary)]">{comparison}</p> : null}
        {detail ? <p className="mt-2 text-xs text-[var(--foreground)]">{detail}</p> : null}
      </div>
    </Card>
  )
}
