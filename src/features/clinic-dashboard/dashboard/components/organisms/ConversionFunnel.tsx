"use client"

import {
  ArrowRight,
  ChevronRight,
  Eye,
  FileCheck2,
  Info,
  type LucideIcon,
  MessageSquare,
  MousePointerClick,
  UserRound,
} from "lucide-react"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type {
  DashboardFunnelStep,
  DashboardReportingPeriod,
  DashboardSelectableMetricId,
} from "../../model/reporting"

const funnelIcons = {
  contacts: { component: MessageSquare, name: "message-square" },
  impressions: { component: Eye, name: "eye" },
  inquiries: { component: FileCheck2, name: "file-check" },
  uniqueVisitors: { component: UserRound, name: "user-round" },
  views: { component: MousePointerClick, name: "mouse-pointer-click" },
} as const satisfies Record<DashboardSelectableMetricId, Readonly<{ component: LucideIcon; name: string }>>

type ConversionFunnelProps = Readonly<{
  controlsId: string
  onMetricSelect: (metricId: DashboardSelectableMetricId) => void
  period: DashboardReportingPeriod
  selectedMetricId: DashboardSelectableMetricId
  steps: readonly DashboardFunnelStep[]
}>

type FunnelConversionInfoProps = Readonly<{
  connectorId: DashboardSelectableMetricId
  conversion: string
  fromLabel: string
  isOpen: boolean
  onOpenChange: (connectorId: DashboardSelectableMetricId, isOpen: boolean) => void
  toLabel: string
}>

function FunnelConversionInfo({
  connectorId,
  conversion,
  fromLabel,
  isOpen,
  onOpenChange,
  toLabel,
}: FunnelConversionInfoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onOpenChange(connectorId, false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(connectorId, false)
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer)
    document.addEventListener("keydown", closeOnEscape)

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [connectorId, isOpen, onOpenChange])

  return (
    <div
      className="relative flex min-h-20 w-full flex-col items-center justify-center px-1 py-1 text-center xl:absolute xl:top-1/2 xl:left-full xl:min-h-0 xl:w-20 xl:-translate-y-1/2 2xl:w-24"
      data-funnel-connector
      ref={containerRef}
    >
      <button
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-label={`Show conversion from ${fromLabel} to ${toLabel}`}
        className="relative z-10 inline-flex size-11 items-center justify-center rounded-md text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        data-funnel-info-trigger
        onBlur={() => onOpenChange(connectorId, false)}
        onClick={() => onOpenChange(connectorId, true)}
        onFocus={() => onOpenChange(connectorId, true)}
        onPointerEnter={() => onOpenChange(connectorId, true)}
        onPointerLeave={() => {
          if (document.activeElement !== triggerRef.current) onOpenChange(connectorId, false)
        }}
        ref={triggerRef}
        type="button"
      >
        <Info aria-hidden="true" className="size-4" />
      </button>
      {isOpen ? (
        <span
          className="absolute bottom-[calc(50%+1.5rem)] left-1/2 z-20 w-max max-w-48 -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-bold whitespace-nowrap text-[var(--foreground)] shadow-xs"
          data-funnel-tooltip
          id={tooltipId}
          role="tooltip"
        >
          {conversion}
        </span>
      ) : null}
      <ArrowRight
        aria-hidden="true"
        className="-mt-1 size-6 shrink-0 rotate-90 text-[var(--foreground)] xl:rotate-0"
        data-funnel-arrow
      />
    </div>
  )
}

export function ConversionFunnel({
  controlsId,
  onMetricSelect,
  period,
  selectedMetricId,
  steps,
}: ConversionFunnelProps) {
  const [openConnectorId, setOpenConnectorId] = useState<DashboardSelectableMetricId | null>(null)
  const selectedStage = steps.find(({ metricId }) => metricId === selectedMetricId)
  const handleConnectorOpenChange = useCallback(
    (connectorId: DashboardSelectableMetricId, isOpen: boolean) => {
      setOpenConnectorId((currentConnectorId) => {
        if (isOpen) return connectorId
        return currentConnectorId === connectorId ? null : currentConnectorId
      })
    },
    [],
  )

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
        className="flex list-none flex-col p-4 xl:grid xl:grid-cols-[repeat(5,minmax(0,1fr))] xl:gap-x-20 xl:p-5 2xl:gap-x-24"
        role="list"
      >
        {steps.map((step, index) => {
          const iconConfig = funnelIcons[step.metricId]
          const FunnelIcon = iconConfig.component
          const isFinalStep = index === steps.length - 1
          const isSelected = selectedMetricId === step.metricId
          const isConnectorOpen = openConnectorId === step.metricId
          const nextStep = steps[index + 1]

          return (
            <li
              className={cn("relative flex min-w-0 flex-col items-center", isConnectorOpen && "z-20")}
              key={step.label}
            >
              <button
                aria-controls={controlsId}
                aria-pressed={isSelected}
                className={cn(
                  "relative min-h-36 w-full rounded-xl p-4 text-center shadow-xs transition-colors 2xl:min-h-40",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
                  isSelected
                    ? "border-0 bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--primary)]",
                )}
                data-funnel-stage={step.metricId}
                onClick={() => onMetricSelect(step.metricId)}
                type="button"
              >
                <FunnelIcon
                  aria-hidden="true"
                  className={cn(
                    "mx-auto size-6",
                    isSelected ? "text-[var(--accent-foreground)]" : "text-[var(--primary)]",
                  )}
                  data-funnel-icon={iconConfig.name}
                />
                <span
                  className={cn(
                    "mt-3 block text-xs font-medium",
                    isSelected ? "text-[var(--accent-foreground)]" : "text-[var(--foreground)]",
                  )}
                >
                  {step.label}
                </span>
                <span className="relative mt-2 flex min-h-8 items-center justify-center px-5">
                  <strong className="text-2xl tracking-tight">{step.value}</strong>
                  <ChevronRight aria-hidden="true" className="absolute right-0 size-5" data-funnel-chevron />
                </span>
              </button>
              {!isFinalStep ? (
                <FunnelConversionInfo
                  connectorId={step.metricId}
                  conversion={nextStep?.conversion ?? ""}
                  fromLabel={step.label}
                  isOpen={isConnectorOpen}
                  onOpenChange={handleConnectorOpenChange}
                  toLabel={nextStep?.label ?? "next stage"}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
      <p aria-live="polite" className="sr-only">
        {selectedStage ? `${selectedStage.label} funnel stage selected.` : null}
      </p>
    </Card>
  )
}
