import {
  ArrowRight,
  ChevronRight,
  Eye,
  FileCheck2,
  MessageSquare,
  MousePointerClick,
  UserRound,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DashboardJourneyStage, DashboardJourneyStageId } from "../../model/dashboard-overview"
import {
  reportingJourneyMeasurementDescription,
  reportingJourneyTransitionDescriptions,
} from "../../model/reporting-journey-information"
import { ReportingInformation } from "../molecules/ReportingInformation"

const icons = {
  impressions: Eye,
  profileViews: MousePointerClick,
  uniqueVisitors: UserRound,
  inquiryStarters: MessageSquare,
  inquiries: FileCheck2,
}

type ReportingJourneyFunnelProps = Readonly<{
  controlsId: string
  stages: readonly DashboardJourneyStage[]
  selectedId: DashboardJourneyStageId
  onSelect: (id: DashboardJourneyStageId) => void
  periodDays: number
}>

export function ReportingJourneyFunnel({
  controlsId,
  stages,
  selectedId,
  onSelect,
  periodDays,
}: ReportingJourneyFunnelProps) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-5">
        <h2 className="text-xl font-bold text-[var(--secondary)] sm:text-2xl">
          Conversion funnel ({periodDays} days)
        </h2>
        <ReportingInformation label="Journey measurements">
          {reportingJourneyMeasurementDescription}
        </ReportingInformation>
      </div>
      <ol
        aria-label="Conversion stages"
        className="flex list-none flex-col p-4 xl:grid xl:grid-cols-[repeat(5,minmax(0,1fr))] xl:gap-x-20 xl:p-5 2xl:gap-x-24"
        role="list"
      >
        {stages.map((stage, index) => {
          const Icon = icons[stage.id]
          const selected = selectedId === stage.id
          const nextStage = stages[index + 1]
          return (
            <li className="relative flex min-w-0 flex-col items-center" key={stage.id}>
              <button
                aria-controls={controlsId}
                aria-pressed={selected}
                className={cn(
                  "relative min-h-36 w-full rounded-xl p-4 text-center shadow-xs transition-colors 2xl:min-h-40",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
                  selected
                    ? "border-0 bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--primary)]",
                )}
                data-funnel-stage={stage.id}
                onClick={() => onSelect(stage.id)}
                type="button"
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "mx-auto size-6",
                    selected ? "text-[var(--accent-foreground)]" : "text-[var(--primary)]",
                  )}
                />
                <span className="mt-3 block text-xs font-medium">{stage.label}</span>
                <span className="relative mt-2 flex min-h-12 items-center justify-center px-5">
                  <strong
                    className={
                      stage.availability === "available" ? "text-2xl tracking-tight" : "text-xs leading-4"
                    }
                  >
                    {stage.value}
                  </strong>
                  <ChevronRight aria-hidden="true" className="absolute right-0 size-5" />
                </span>
              </button>
              {nextStage && stage.id !== "inquiries" ? (
                <div className="flex min-h-20 w-full flex-col items-center justify-center px-1 py-1 text-center xl:absolute xl:top-1/2 xl:left-full xl:min-h-0 xl:w-20 xl:-translate-y-1/2 2xl:w-24">
                  <ReportingInformation label={`${stage.label} to ${nextStage.label}`}>
                    {reportingJourneyTransitionDescriptions[stage.id]}
                  </ReportingInformation>
                  <ArrowRight
                    aria-hidden="true"
                    className="-mt-1 size-6 shrink-0 rotate-90 text-[var(--foreground)] xl:rotate-0"
                  />
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
