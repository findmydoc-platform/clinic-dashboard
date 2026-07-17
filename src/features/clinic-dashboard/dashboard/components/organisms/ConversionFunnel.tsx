import {
  ArrowRight,
  CircleDot,
  Eye,
  FileCheck2,
  MessageSquare,
  MousePointerClick,
  UserRound,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DashboardFunnelStep, DashboardReportingPeriod } from "../../model/reporting"

const funnelIcons = {
  Contacts: { component: MessageSquare, name: "message-square" },
  Impressions: { component: Eye, name: "eye" },
  Inquiries: { component: FileCheck2, name: "file-check" },
  "Profile views": { component: MousePointerClick, name: "mouse-pointer-click" },
  "Unique visitors": { component: UserRound, name: "user-round" },
} as const

type ConversionFunnelProps = Readonly<{
  period: DashboardReportingPeriod
  steps: readonly DashboardFunnelStep[]
}>

export function ConversionFunnel({ period, steps }: ConversionFunnelProps) {
  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-[var(--secondary)] sm:text-2xl">
          Conversion funnel ({period})
        </h2>
        <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--secondary)]">
          <span className="size-2 rounded-full bg-[var(--accent)]" /> Process optimization active
        </span>
      </div>
      <ol
        aria-label="Conversion stages"
        className="flex list-none flex-col gap-2 p-4 xl:grid xl:grid-cols-[minmax(0,10rem)_minmax(3rem,1fr)_minmax(0,10rem)_minmax(3rem,1fr)_minmax(0,10rem)_minmax(3rem,1fr)_minmax(0,10rem)_minmax(3rem,1fr)_minmax(0,10rem)] xl:gap-0 xl:p-5"
        role="list"
      >
        {steps.map((step, index) => {
          const iconConfig = funnelIcons[step.label as keyof typeof funnelIcons] ?? {
            component: CircleDot,
            name: "circle-dot",
          }
          const FunnelIcon = iconConfig.component
          const isFinalStep = index === steps.length - 1

          return (
            <li
              className={cn(
                "min-w-0",
                isFinalStep ? "xl:col-span-1" : "xl:col-span-2 xl:grid xl:grid-cols-subgrid",
              )}
              key={step.label}
            >
              <div
                className={cn(
                  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center xl:max-w-40",
                  isFinalStep && "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]",
                )}
                data-funnel-stage
              >
                <FunnelIcon
                  aria-hidden="true"
                  className={cn(
                    "mx-auto size-6 text-[var(--primary)]",
                    isFinalStep && "text-[var(--accent-foreground)]",
                  )}
                  data-funnel-icon={iconConfig.name}
                />
                {step.conversion ? (
                  <span
                    className={cn(
                      "mt-3 block text-xs font-bold text-[var(--primary)]",
                      isFinalStep && "text-[var(--accent-foreground)]",
                    )}
                  >
                    {step.conversion}
                  </span>
                ) : null}
                <strong className="mt-2 block text-2xl tracking-tight">{step.value}</strong>
                <span
                  className={cn(
                    "text-[10px] tracking-wide text-[var(--foreground)] uppercase",
                    isFinalStep && "text-[var(--accent-foreground)]",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isFinalStep ? (
                <div
                  aria-hidden="true"
                  className="hidden items-center justify-center xl:flex"
                  data-funnel-connector
                >
                  <ArrowRight
                    className="size-8 shrink-0 rounded-full bg-[var(--background)] p-1 text-[var(--foreground)]"
                    data-funnel-arrow
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
