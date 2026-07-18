"use client"

import {
  ArrowRight,
  ChevronRight,
  CircleDot,
  Eye,
  FileCheck2,
  MessageSquare,
  MousePointerClick,
  UserRound,
} from "lucide-react"
import { useState } from "react"
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
  const [selectedStage, setSelectedStage] = useState<string | null>(null)

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
        className="flex list-none flex-col p-4 xl:grid xl:grid-cols-[minmax(0,9rem)_minmax(4.5rem,1fr)_minmax(0,9rem)_minmax(4.5rem,1fr)_minmax(0,9rem)_minmax(4.5rem,1fr)_minmax(0,9rem)_minmax(4.5rem,1fr)_minmax(0,9rem)] xl:p-5"
        role="list"
      >
        {steps.map((step, index) => {
          const iconConfig = funnelIcons[step.label as keyof typeof funnelIcons] ?? {
            component: CircleDot,
            name: "circle-dot",
          }
          const FunnelIcon = iconConfig.component
          const isFinalStep = index === steps.length - 1
          const isSelected = selectedStage === step.label
          const nextStep = steps[index + 1]

          return (
            <li
              className={cn(
                "flex min-w-0 flex-col items-center",
                isFinalStep ? "xl:col-span-1" : "xl:col-span-2 xl:grid xl:grid-cols-subgrid",
              )}
              key={step.label}
            >
              <button
                aria-pressed={isSelected}
                className={cn(
                  "relative min-h-36 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-center shadow-xs transition-colors",
                  "hover:border-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
                  "xl:max-w-36",
                  isSelected && "border-[var(--primary)] ring-2 ring-[var(--primary)] ring-offset-2",
                  isFinalStep &&
                    "border-[var(--accent)] bg-[var(--accent-soft)] hover:border-[var(--primary)]",
                )}
                data-funnel-stage
                onClick={() => setSelectedStage(step.label)}
                type="button"
              >
                <FunnelIcon
                  aria-hidden="true"
                  className="mx-auto size-6 text-[var(--primary)]"
                  data-funnel-icon={iconConfig.name}
                />
                <span className="mt-3 block text-xs font-medium text-[var(--foreground)]">{step.label}</span>
                <span className="relative mt-2 flex min-h-8 items-center justify-center px-5">
                  <strong className="text-2xl tracking-tight">{step.value}</strong>
                  <ChevronRight aria-hidden="true" className="absolute right-0 size-5" data-funnel-chevron />
                </span>
              </button>
              {!isFinalStep ? (
                <div
                  className="flex min-h-20 w-full flex-col items-center justify-center px-2 py-2 text-center xl:min-h-0"
                  data-funnel-connector
                >
                  <span
                    className="max-w-24 text-[11px] leading-tight font-bold text-[var(--primary)]"
                    data-funnel-conversion
                  >
                    {nextStep?.conversion}
                  </span>
                  <span className="relative mt-1 flex w-full items-center justify-center">
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 hidden border-t border-[var(--border)] xl:block"
                      data-funnel-connector-line
                    />
                    <ArrowRight
                      aria-hidden="true"
                      className="relative z-10 size-6 shrink-0 rotate-90 bg-[var(--background)] text-[var(--foreground)] xl:rotate-0"
                      data-funnel-arrow
                    />
                  </span>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
      <p aria-live="polite" className="sr-only">
        {selectedStage ? `${selectedStage} funnel stage selected.` : null}
      </p>
    </Card>
  )
}
