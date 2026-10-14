import { ArrowRight, FileCheck2, Eye } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { DashboardSessionFunnel } from "../../model/dashboard-overview"
import { ReportingInformation } from "../molecules/ReportingInformation"

type ReportingSessionFunnelProps = Readonly<{ funnel: DashboardSessionFunnel; periodDays: number }>

export function ReportingSessionFunnel({ funnel, periodDays }: ReportingSessionFunnelProps) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-5">
        <div>
          <h2 className="text-xl font-bold text-[var(--secondary)] sm:text-2xl">
            Conversion funnel ({periodDays} days)
          </h2>
          <p className="mt-1 text-sm">Consent-limited session conversion</p>
        </div>
        <ReportingInformation label="Session conversion">{funnel.information}</ReportingInformation>
      </div>
      <ol
        aria-label="Conversion stages"
        className="flex list-none flex-col items-center justify-center gap-24 p-5 sm:flex-row"
      >
        <li className="relative w-full max-w-40 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
          <Eye aria-hidden="true" className="mx-auto size-6 text-[var(--primary)]" />
          <span className="mt-3 block text-xs">Profile-view sessions</span>
          <strong className="mt-2 block text-xl">{funnel.profileSessions}</strong>
          {funnel.conversion ? (
            <div className="absolute top-full left-1/2 flex h-24 -translate-x-1/2 flex-col items-center justify-center gap-2 text-sm font-bold text-[var(--primary)] sm:top-1/2 sm:left-full sm:h-auto sm:w-24 sm:translate-x-0 sm:-translate-y-1/2">
              <span>{funnel.conversion}</span>
              <ArrowRight aria-hidden="true" className="size-8 rotate-90 sm:rotate-0" />
            </div>
          ) : null}
        </li>
        <li className="w-full max-w-40 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
          <FileCheck2 aria-hidden="true" className="mx-auto size-6 text-[var(--primary)]" />
          <span className="mt-3 block text-xs">Converted sessions</span>
          <strong className="mt-2 block text-xl">{funnel.convertedSessions}</strong>
        </li>
      </ol>
      {funnel.detail ? <p className="px-5 pb-5 text-sm">{funnel.detail}</p> : null}
      {funnel.comparison ? (
        <p className="px-5 pb-5 text-xs text-[var(--primary)]">{funnel.comparison}</p>
      ) : null}
    </Card>
  )
}
