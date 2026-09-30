import { Card } from "@/components/ui/card"

type ReportingMetricCardProps = Readonly<{
  comparison?: string
  detail?: string
  label: string
  value: string
}>

export function ReportingMetricCard({ comparison, detail, label, value }: ReportingMetricCardProps) {
  return (
    <Card className="min-w-0 shadow-none">
      <div className="p-4">
        <p className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--secondary)]">{value}</p>
        {comparison ? <p className="mt-2 text-xs font-medium text-[var(--primary)]">{comparison}</p> : null}
        {detail ? <p className="mt-2 text-xs text-[var(--foreground)]">{detail}</p> : null}
      </div>
    </Card>
  )
}
