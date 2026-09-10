import {
  ArrowRight,
  ChevronRight,
  Clock3,
  FileCheck2,
  Info,
  MessageSquare,
  MousePointerClick,
  UserRound,
  Eye,
  X,
  type LucideIcon,
} from "lucide-react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps } from "react"
import { createPortal } from "react-dom"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Card } from "@/components/ui/card"
import { PageHeading } from "@/components/ui/page-heading"
import { cn } from "@/lib/utils"
import { createDashboardMetricSelection } from "../../model/dashboard-metric-selection"
import type { DashboardViewModel } from "../../model/dashboard-view-model"
import { createDashboardProfileCompletionMetric } from "../../model/profile-progress"
import type { DashboardMetricSelection } from "../../model/dashboard-metric-selection"
import type { DashboardMetric, DashboardSelectableMetricId } from "../../model/reporting"
import { dashboardViewModel } from "../../testing/dashboard.fixtures"
import { MetricCard } from "../molecules/MetricCard"
import { DashboardMetricChart } from "../molecules/DashboardMetricChart"
import { ClinicPreview } from "./ClinicPreview"
import { DashboardMetricPanel } from "./DashboardMetricPanel"
import { ProfileProgress } from "./ProfileProgress"
import { ReviewSummary } from "./ReviewSummary"
import { DashboardScreen } from "./DashboardScreen"

type AvailabilityState =
  "comparison-available" | "comparison-not-yet-available" | "no-complete-history" | "source-unavailable"
type Issue136StoryArgs = ComponentProps<typeof DashboardScreen> & {
  availability: AvailabilityState
  daysRemaining: number
}

const meta = {
  argTypes: {
    availability: {
      control: "radio",
      description: "Prototype state for consent-based analytics figures.",
      options: [
        "comparison-available",
        "comparison-not-yet-available",
        "no-complete-history",
        "source-unavailable",
      ],
      table: { category: "Prototype" },
    },
    daysRemaining: {
      control: { max: 90, min: 1, step: 1, type: "number" },
      description: "Days until the next analytics state becomes available.",
      table: { category: "Prototype" },
    },
  },
  component: DashboardScreen,
  parameters: { layout: "fullscreen" },
  tags: ["domain:dashboard", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Organisms/Dashboard Screen — Issue 136 Prototype",
} satisfies Meta<Issue136StoryArgs>

export default meta
type Story = StoryObj<Issue136StoryArgs>

type PrototypeStage = Readonly<{
  conversion?: string
  detail?: string
  icon: LucideIcon
  label: string
  metricId: DashboardSelectableMetricId
  source: "payload" | "posthog"
  state: "available" | "no-complete-history" | "source-unavailable"
  value?: string
}>

const funnelIcons = {
  contacts: MessageSquare,
  impressions: Eye,
  inquiries: FileCheck2,
  uniqueVisitors: UserRound,
  views: MousePointerClick,
} as const satisfies Record<DashboardSelectableMetricId, LucideIcon>

type PrototypeHintPlacement =
  Readonly<{ side: "sheet" }> | Readonly<{ left: number; side: "bottom" | "top"; top: number }>

function usePrototypeAdaptiveHint({
  restoreFocusOnEscape = false,
  useMobileSheet = false,
}: Readonly<{
  restoreFocusOnEscape?: boolean
  useMobileSheet?: boolean
}> = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [placement, setPlacement] = useState<PrototypeHintPlacement | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreNextTriggerFocusRef = useRef(false)
  const panelRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current === null) return

    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }, [])

  const close = useCallback(() => {
    cancelScheduledClose()
    setIsOpen(false)
    setIsPinned(false)
    setPlacement(null)
  }, [cancelScheduledClose])

  const openTransiently = useCallback(() => {
    if (ignoreNextTriggerFocusRef.current) {
      ignoreNextTriggerFocusRef.current = false
      return
    }

    cancelScheduledClose()
    setIsOpen(true)
  }, [cancelScheduledClose])

  const openPinned = useCallback(() => {
    cancelScheduledClose()
    setIsOpen(true)
    setIsPinned(true)
  }, [cancelScheduledClose])

  const scheduleTransientClose = useCallback(() => {
    cancelScheduledClose()
    closeTimerRef.current = setTimeout(() => {
      const trigger = triggerRef.current
      const panel = panelRef.current
      const activeElement = trigger?.ownerDocument.activeElement

      if (isPinned || trigger?.matches(":focus") || (activeElement && panel?.contains(activeElement))) return

      setIsOpen(false)
      setPlacement(null)
    }, 120)
  }, [cancelScheduledClose, isPinned])

  const restoreTriggerFocus = useCallback(() => {
    ignoreNextTriggerFocusRef.current = true

    triggerRef.current?.focus({ preventScroll: true })
    close()
  }, [close])

  const updatePlacement = useCallback(() => {
    const trigger = triggerRef.current
    const panel = panelRef.current
    const view = trigger?.ownerDocument.defaultView
    if (!trigger || !panel || !view) return

    if (useMobileSheet && view.innerWidth < 640) {
      setPlacement({ side: "sheet" })
      return
    }

    const collisionPadding = 16
    const sideOffset = 8
    const triggerRect = trigger.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    const availableAbove = triggerRect.top - collisionPadding
    const availableBelow = view.innerHeight - triggerRect.bottom - collisionPadding
    const side =
      availableAbove >= panelRect.height + sideOffset || availableAbove >= availableBelow ? "top" : "bottom"
    const unclampedTop =
      side === "top" ? triggerRect.top - panelRect.height - sideOffset : triggerRect.bottom + sideOffset
    const maximumTop = Math.max(collisionPadding, view.innerHeight - panelRect.height - collisionPadding)
    const maximumLeft = Math.max(collisionPadding, view.innerWidth - panelRect.width - collisionPadding)

    setPlacement({
      left: Math.round(
        Math.max(
          collisionPadding,
          Math.min(triggerRect.left + triggerRect.width / 2 - panelRect.width / 2, maximumLeft),
        ),
      ),
      side,
      top: Math.round(Math.max(collisionPadding, Math.min(unclampedTop, maximumTop))),
    })
  }, [useMobileSheet])

  useLayoutEffect(() => {
    if (isOpen) updatePlacement()
  }, [isOpen, updatePlacement])

  useEffect(() => {
    if (!isOpen) return

    const trigger = triggerRef.current
    const panel = panelRef.current
    const document = trigger?.ownerDocument
    const view = document?.defaultView
    if (!trigger || !panel || !document || !view) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (!trigger.contains(target) && !panel.contains(target)) close()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return

      if (restoreFocusOnEscape) {
        restoreTriggerFocus()
        return
      }

      close()
    }
    const resizeObserver = new ResizeObserver(updatePlacement)

    document.addEventListener("pointerdown", closeOnOutsidePointer)
    document.addEventListener("keydown", closeOnEscape)
    view.addEventListener("resize", updatePlacement)
    view.addEventListener("scroll", updatePlacement, true)
    resizeObserver.observe(trigger)
    resizeObserver.observe(panel)

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer)
      document.removeEventListener("keydown", closeOnEscape)
      view.removeEventListener("resize", updatePlacement)
      view.removeEventListener("scroll", updatePlacement, true)
      resizeObserver.disconnect()
    }
  }, [close, isOpen, restoreFocusOnEscape, restoreTriggerFocus, updatePlacement])

  useEffect(() => () => cancelScheduledClose(), [cancelScheduledClose])

  return {
    close,
    isOpen,
    isPinned,
    openPinned,
    openTransiently,
    panelRef,
    placement,
    restoreTriggerFocus,
    scheduleTransientClose,
    triggerRef,
  }
}

function getPrototypeHintStyle(placement: PrototypeHintPlacement | null) {
  if (!placement || placement.side === "sheet") return undefined

  return { left: `${placement.left}px`, top: `${placement.top}px` }
}

function PrototypeInfoHint({
  buttonLabel,
  message,
  title,
}: Readonly<{
  buttonLabel: string
  message: string
  title: string
}>) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogId = useId()
  const titleId = useId()
  const {
    isPinned,
    isOpen,
    openPinned,
    openTransiently,
    panelRef,
    placement,
    restoreTriggerFocus,
    scheduleTransientClose,
    triggerRef,
  } = usePrototypeAdaptiveHint({ restoreFocusOnEscape: true, useMobileSheet: true })
  const isMobileSheet = placement?.side === "sheet"
  const isPersistentHint = isPinned || isMobileSheet

  useLayoutEffect(() => {
    if (!isMobileSheet) return

    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus({ preventScroll: true }))

    return () => cancelAnimationFrame(frame)
  }, [isMobileSheet])

  return (
    <span className="inline-flex">
      <button
        aria-controls={dialogId}
        aria-describedby={isOpen && !isPersistentHint ? dialogId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={buttonLabel}
        className="inline-flex size-11 items-center justify-center rounded-md text-slate-500 hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        onBlur={scheduleTransientClose}
        onClick={openPinned}
        onFocus={openTransiently}
        onPointerEnter={openTransiently}
        onPointerLeave={scheduleTransientClose}
        ref={triggerRef}
        type="button"
      >
        <Info aria-hidden="true" className="size-4" />
      </button>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-labelledby={titleId}
              className={cn(
                "fixed z-50 max-h-[calc(100vh-2rem)] overflow-y-auto border border-[var(--border)] bg-[var(--background)] p-4 text-left text-sm text-[var(--foreground)] shadow-lg",
                placement?.side === "sheet"
                  ? "right-0 bottom-0 left-0 w-auto rounded-xl rounded-b-none"
                  : "w-80 max-w-[calc(100vw-2rem)] rounded-xl",
                placement ? "visible" : "invisible",
              )}
              data-prototype-hint-panel
              data-prototype-hint-side={placement?.side}
              id={dialogId}
              onPointerEnter={openTransiently}
              onPointerLeave={scheduleTransientClose}
              ref={panelRef as React.RefObject<HTMLDivElement>}
              role={isPersistentHint ? "dialog" : "tooltip"}
              style={getPrototypeHintStyle(placement)}
            >
              <div className="mb-2 flex items-start justify-between gap-3 font-bold text-[var(--secondary)]">
                <span id={titleId}>{title}</span>
                {isPersistentHint ? (
                  <button
                    aria-label={`Close ${title.toLowerCase()}`}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                    onClick={restoreTriggerFocus}
                    ref={closeButtonRef}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                ) : null}
              </div>
              <p className="leading-5">{message}</p>
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}

function ConsentInfoHint() {
  return (
    <PrototypeInfoHint
      buttonLabel="Explain which visits are included"
      message="For privacy reasons, these figures only include visits where analytics consent was given. Actual activity may be higher."
      title="About these figures"
    />
  )
}

function createPrototypeStages(
  model: DashboardViewModel,
  availability: AvailabilityState,
): readonly PrototypeStage[] {
  return model.reporting.funnel.map((step) => {
    const source = step.metricId === "inquiries" ? "payload" : "posthog"
    const base = {
      conversion: step.conversion,
      icon: funnelIcons[step.metricId],
      label: step.label,
      metricId: step.metricId,
      source,
    } as const

    if (source === "payload") return { ...base, detail: "Payload", state: "available", value: step.value }

    if (availability === "no-complete-history") {
      return {
        ...base,
        detail: "No complete history yet",
        icon: Clock3,
        state: availability,
        value: undefined,
      }
    }

    if (availability === "source-unavailable") {
      return {
        ...base,
        icon: Info,
        state: availability,
        value: "Unavailable",
      }
    }

    return {
      ...base,
      state: "available",
      value: step.value,
    }
  })
}

function PrototypeConversionInfo({
  conversion,
  fromLabel,
  toLabel,
}: Readonly<{
  conversion: string
  fromLabel: string
  toLabel: string
}>) {
  const tooltipId = useId()
  const { isOpen, openPinned, openTransiently, panelRef, placement, scheduleTransientClose, triggerRef } =
    usePrototypeAdaptiveHint()

  return (
    <div className="relative flex min-h-20 w-full flex-col items-center justify-center px-1 py-1 text-center xl:absolute xl:top-1/2 xl:left-full xl:min-h-0 xl:w-20 xl:-translate-y-1/2 2xl:w-24">
      <button
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-label={`Show conversion from ${fromLabel} to ${toLabel}`}
        className="relative z-10 inline-flex size-11 items-center justify-center rounded-md text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        onBlur={scheduleTransientClose}
        onClick={openPinned}
        onFocus={openTransiently}
        onPointerEnter={openTransiently}
        onPointerLeave={scheduleTransientClose}
        ref={triggerRef}
        type="button"
      >
        <Info aria-hidden="true" className="size-4" />
      </button>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <span
              className={cn(
                "fixed z-50 w-max max-w-[calc(100vw-2rem)] rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-bold whitespace-nowrap text-[var(--foreground)] shadow-xs",
                placement ? "visible" : "invisible",
              )}
              data-prototype-hint-panel
              data-prototype-hint-side={placement?.side}
              id={tooltipId}
              onPointerEnter={openTransiently}
              onPointerLeave={scheduleTransientClose}
              ref={panelRef as React.RefObject<HTMLSpanElement>}
              role="tooltip"
              style={getPrototypeHintStyle(placement)}
            >
              {conversion}
            </span>,
            document.body,
          )
        : null}
      <ArrowRight
        aria-hidden="true"
        className="-mt-1 size-6 shrink-0 rotate-90 text-[var(--foreground)] xl:rotate-0"
      />
    </div>
  )
}

function AvailabilityFunnelPrototype({
  availability,
  controlsId,
  onMetricSelect,
  period,
  selectedMetricId,
  model,
}: Readonly<{
  availability: AvailabilityState
  controlsId: string
  model: DashboardViewModel
  onMetricSelect: (metricId: DashboardSelectableMetricId) => void
  period: DashboardViewModel["reporting"]["period"]
  selectedMetricId: DashboardSelectableMetricId
}>) {
  const stages = createPrototypeStages(model, availability)
  const selectedStage = stages.find(({ metricId }) => metricId === selectedMetricId)
  const showConversions =
    availability === "comparison-available" || availability === "comparison-not-yet-available"

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <h2 className="text-xl font-bold text-[var(--secondary)] sm:text-2xl">
            Conversion funnel ({period})
          </h2>
          <ConsentInfoHint />
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--secondary)]">
          <span className="size-2 rounded-full bg-[var(--accent)]" /> Process optimization active
        </span>
      </div>
      <ol
        aria-label="Conversion stages"
        className="flex list-none flex-col p-4 xl:grid xl:grid-cols-[repeat(5,minmax(0,1fr))] xl:gap-x-20 xl:p-5 2xl:gap-x-24"
        role="list"
      >
        {stages.map((stage, index) => {
          const StageIcon = stage.icon
          const isUnavailable = stage.state !== "available"
          const isSelected = selectedMetricId === stage.metricId && !isUnavailable

          return (
            <li className="relative flex min-w-0 flex-col items-center" key={stage.metricId}>
              <button
                aria-controls={!isUnavailable ? controlsId : undefined}
                aria-disabled={isUnavailable || undefined}
                aria-pressed={isSelected}
                className={cn(
                  "relative min-h-36 w-full rounded-xl p-4 text-center shadow-xs transition-colors 2xl:min-h-40",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
                  isUnavailable
                    ? "cursor-default border border-slate-200 bg-slate-100 text-slate-600"
                    : isSelected
                      ? "border-0 bg-[var(--accent)] text-[var(--accent-foreground)]"
                      : "border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--primary)]",
                )}
                disabled={isUnavailable}
                onClick={() => onMetricSelect(stage.metricId)}
                type="button"
              >
                <StageIcon
                  aria-hidden="true"
                  className={cn(
                    "mx-auto size-6",
                    isUnavailable
                      ? "text-slate-500"
                      : isSelected
                        ? "text-[var(--accent-foreground)]"
                        : "text-[var(--primary)]",
                  )}
                />
                <span
                  className={cn(
                    "mt-3 block text-xs font-medium",
                    isSelected ? "text-[var(--accent-foreground)]" : undefined,
                  )}
                >
                  {stage.label}
                </span>
                <span className="relative mt-2 flex min-h-8 items-center justify-center px-5">
                  {stage.value ? <strong className="text-2xl tracking-tight">{stage.value}</strong> : null}
                  {!isUnavailable ? (
                    <ChevronRight aria-hidden="true" className="absolute right-0 size-5" />
                  ) : null}
                </span>
                {stage.detail ? <span className="mt-2 block text-xs leading-4">{stage.detail}</span> : null}
              </button>
              {showConversions && index < stages.length - 1 ? (
                <PrototypeConversionInfo
                  conversion={stages[index + 1]?.conversion ?? ""}
                  fromLabel={stage.label}
                  toLabel={stages[index + 1]?.label ?? "next stage"}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
      <p aria-live="polite" className="sr-only">
        {selectedStage?.state === "available" ? `${selectedStage.label} funnel stage selected.` : null}
      </p>
    </Card>
  )
}

function getDaysLabel(daysRemaining: number) {
  const days = Math.max(1, Math.round(daysRemaining))

  return `${days} more ${days === 1 ? "day" : "days"}`
}

function AnalyticsMetricCard({
  availability,
  daysRemaining,
  metric,
  period,
}: Readonly<{
  availability: Exclude<AvailabilityState, "comparison-available">
  daysRemaining: number
  metric: Readonly<DashboardMetric & { id: DashboardSelectableMetricId }>
  period: DashboardViewModel["reporting"]["period"]
}>) {
  const MetricIcon = funnelIcons[metric.id]
  const periodLabel = period.replace(" days", "-day")
  const content =
    availability === "comparison-not-yet-available"
      ? {
          buttonLabel: `Explain missing comparison for ${metric.label}`,
          message: `We need ${getDaysLabel(daysRemaining)} of data before we can compare this period with the previous ${period}.`,
          statusText: undefined,
          title: "Comparison not yet available",
          value: metric.value,
        }
      : availability === "no-complete-history"
        ? {
            buttonLabel: `Explain incomplete history for ${metric.label}`,
            message: `We need ${getDaysLabel(daysRemaining)} of data before we can show the first complete ${periodLabel} view.`,
            statusText: "No complete history yet",
            title: "No complete history yet",
            value: undefined,
          }
        : {
            buttonLabel: `Explain why ${metric.label.toLowerCase()} are unavailable`,
            message:
              "Website activity figures are temporarily unavailable. A missing figure does not mean zero. Inquiries remain visible because they come from a separate source.",
            statusText: "Not available",
            title: "Figures temporarily unavailable",
            value: undefined,
          }

  return (
    <Card className="min-w-0 shadow-none">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
            {metric.label}
          </span>
          <span className="p-1 text-[var(--primary)]">
            <MetricIcon aria-hidden="true" className="size-4" />
          </span>
        </div>
        <div className="mt-2 flex min-h-8 items-center gap-1">
          {content.value ? (
            <strong className="text-2xl tracking-tight">{content.value}</strong>
          ) : (
            <strong className="text-sm leading-5 tracking-tight text-slate-600">{content.statusText}</strong>
          )}
          <PrototypeInfoHint
            buttonLabel={content.buttonLabel}
            message={content.message}
            title={content.title}
          />
        </div>
        {availability === "comparison-not-yet-available" && metric.note ? (
          <p className="mt-2 text-xs text-[var(--foreground)]">{metric.note}</p>
        ) : null}
      </div>
    </Card>
  )
}

function ComparisonNotYetAvailableMetricPanel({
  daysRemaining,
  id,
  metric,
  period,
}: Readonly<{
  daysRemaining: number
  id: string
  metric: DashboardMetricSelection
  period: DashboardViewModel["reporting"]["period"]
}>) {
  return (
    <Card className="flex h-full min-w-0 flex-col" id={id}>
      <div className="border-b border-[var(--border)] p-5">
        <h2 className="text-xl font-bold text-[var(--secondary)]">{metric.title}</h2>
        <p className="mt-1 text-xs font-bold text-[var(--primary)]">Comparison not yet available</p>
        <p className="mt-1 text-xs text-[var(--foreground)]">
          We need {getDaysLabel(daysRemaining)} of data before we can compare this period with the previous{" "}
          {period}.
        </p>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <DashboardMetricChart
          key={`${period}-${metric.id}`}
          description={metric.description}
          points={metric.points}
          valueLabels={metric.valueLabels}
        />
      </div>
    </Card>
  )
}

function EmptyMetricPanel({
  availability,
  daysRemaining,
  id,
  period,
  title,
}: Readonly<{
  availability: "no-complete-history" | "source-unavailable"
  daysRemaining: number
  id: string
  period: DashboardViewModel["reporting"]["period"]
  title: string
}>) {
  const isHistory = availability === "no-complete-history"
  const periodLabel = period.replace(" days", "-day")

  return (
    <Card className="flex h-full min-w-0 flex-col" id={id}>
      <div className="border-b border-[var(--border)] p-5">
        <h2 className="text-xl font-bold text-[var(--secondary)]">{title}</h2>
        <p className="mt-1 text-xs font-bold text-[var(--primary)]">
          {isHistory ? "No complete history yet" : "Figures temporarily unavailable"}
        </p>
      </div>
      <div className="flex min-h-80 flex-1 items-center justify-center p-5 text-center text-sm text-[var(--foreground)]">
        {isHistory
          ? `We need ${getDaysLabel(daysRemaining)} of data before we can show the first complete ${periodLabel} view.`
          : "Website activity figures are temporarily unavailable. A missing figure does not mean zero."}
      </div>
    </Card>
  )
}

function Issue136DashboardPrototype({ args }: Readonly<{ args: Issue136StoryArgs }>) {
  const { availability, daysRemaining } = args
  const [selectedMetricId, setSelectedMetricId] = useState<DashboardSelectableMetricId>(
    args.model.selectedMetric.id,
  )
  const metricPanelId = useId()
  const profileCompletionMetric = createDashboardProfileCompletionMetric(args.model.profileProgress)
  const reporting = args.model.reporting
  const selectedMetric = createDashboardMetricSelection(reporting, selectedMetricId)
  const selectedMetricUsesIndependentSource = selectedMetricId === "inquiries"
  const panel =
    availability === "comparison-available" || selectedMetricUsesIndependentSource ? (
      <DashboardMetricPanel
        canDownloadProfileViews={args.canDownloadProfileViews}
        id={metricPanelId}
        metric={selectedMetric}
        onDownloadProfileViews={args.actions.onProfileViewsDownload}
        period={reporting.period}
      />
    ) : availability === "comparison-not-yet-available" ? (
      <ComparisonNotYetAvailableMetricPanel
        daysRemaining={daysRemaining}
        id={metricPanelId}
        metric={selectedMetric}
        period={reporting.period}
      />
    ) : (
      <EmptyMetricPanel
        availability={availability}
        daysRemaining={daysRemaining}
        id={metricPanelId}
        period={reporting.period}
        title={selectedMetric.title}
      />
    )

  return (
    <div className="space-y-6">
      <PageHeading
        description={`Performance for ${args.model.clinicPreview.name}: visibility, enquiries, and profile health.`}
      >
        Dashboard
      </PageHeading>
      <section aria-label="Dashboard metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard metric={profileCompletionMetric} />
        {reporting.metrics.map((metric) =>
          metric.id === "inquiries" || availability === "comparison-available" ? (
            <MetricCard key={metric.id} metric={metric} />
          ) : (
            <AnalyticsMetricCard
              availability={availability}
              daysRemaining={daysRemaining}
              key={metric.id}
              metric={metric}
              period={reporting.period}
            />
          ),
        )}
      </section>
      <div
        className="grid gap-6 xl:grid-cols-[0.8fr_1.7fr_0.8fr] xl:items-stretch"
        data-dashboard-content-grid
      >
        <div className="min-w-0 xl:col-start-1 xl:row-start-2" data-dashboard-profile-progress>
          <ProfileProgress
            onRetry={args.actions.onProfileProgressRetry}
            onTaskOpen={args.actions.onProfileTaskOpen}
            progress={args.model.profileProgress}
          />
        </div>
        <div className="min-w-0 xl:col-span-3 xl:col-start-1 xl:row-start-1" data-dashboard-funnel>
          <AvailabilityFunnelPrototype
            availability={availability}
            controlsId={metricPanelId}
            model={{ ...args.model, reporting, selectedMetric }}
            onMetricSelect={(metricId) => {
              args.actions.onMetricSelect(metricId)
              setSelectedMetricId(metricId)
            }}
            period={reporting.period}
            selectedMetricId={selectedMetricId}
          />
        </div>
        <div className="min-w-0 xl:col-start-2 xl:row-start-2" data-dashboard-metric-panel>
          {panel}
        </div>
        <div
          className="grid min-w-0 gap-6 xl:col-start-3 xl:row-start-2 xl:h-full xl:grid-rows-[auto_1fr]"
          data-dashboard-summary-column
        >
          <ReviewSummary
            onOpen={args.actions.onReviewsOpen}
            rating={args.model.rating}
            reviewActivity={reporting.reviewActivity}
          />
          <ClinicPreview clinic={args.model.clinicPreview} />
        </div>
      </div>
    </div>
  )
}

export const FunnelAvailability: Story = {
  name: "Source unavailable",
  args: {
    actions: {
      onMetricSelect: () => undefined,
      onProfileProgressRetry: () => undefined,
      onProfileTaskOpen: () => undefined,
      onProfileViewsDownload: () => undefined,
      onReviewsOpen: () => undefined,
    },
    availability: "source-unavailable",
    canDownloadProfileViews: true,
    daysRemaining: 4,
    model: dashboardViewModel,
  },
  render: (args) => <Issue136DashboardPrototype args={args as Issue136StoryArgs} />,
}

export const ComparisonNotYetAvailable: Story = {
  args: {
    ...FunnelAvailability.args,
    availability: "comparison-not-yet-available",
  },
  render: (args) => <Issue136DashboardPrototype args={args as Issue136StoryArgs} />,
}

export const NoCompleteHistoryYet: Story = {
  args: {
    ...FunnelAvailability.args,
    availability: "no-complete-history",
  },
  render: (args) => <Issue136DashboardPrototype args={args as Issue136StoryArgs} />,
}

export const ComparisonAvailable: Story = {
  args: {
    ...FunnelAvailability.args,
    availability: "comparison-available",
  },
  render: (args) => <Issue136DashboardPrototype args={args as Issue136StoryArgs} />,
}

export const ComparisonHintFocused: Story = {
  args: ComparisonNotYetAvailable.args,
  name: "Comparison hint · Focus",
  play: async ({ canvasElement }) => {
    within(canvasElement).getByRole("button", { name: "Explain missing comparison for Impressions" }).focus()
  },
  render: (args) => <Issue136DashboardPrototype args={args as Issue136StoryArgs} />,
}

export const ComparisonHintHovered: Story = {
  args: ComparisonNotYetAvailable.args,
  name: "Comparison hint · Hover",
  play: async ({ canvasElement }) => {
    await userEvent.hover(
      within(canvasElement).getByRole("button", { name: "Explain missing comparison for Impressions" }),
    )

    const page = within(canvasElement.ownerDocument.body)
    await expect(page.getByRole("tooltip", { name: "Comparison not yet available" })).toBeVisible()
    await expect(
      page.queryByRole("button", { name: "Close comparison not yet available" }),
    ).not.toBeInTheDocument()
  },
  render: (args) => <Issue136DashboardPrototype args={args as Issue136StoryArgs} />,
}

export const ComparisonHintNearLowerEdge: Story = {
  args: ComparisonNotYetAvailable.args,
  name: "Comparison hint · Lower edge",
  play: async ({ canvasElement }) => {
    within(canvasElement).getByRole("button", { name: "Explain missing comparison for Impressions" }).focus()
  },
  render: (args) => (
    <div className="pt-[calc(100vh-18rem)]">
      <Issue136DashboardPrototype args={args as Issue136StoryArgs} />
    </div>
  ),
}

export const ComparisonHintClicked: Story = {
  args: ComparisonNotYetAvailable.args,
  name: "Comparison hint · Click",
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "Explain missing comparison for Impressions",
      }),
    )

    const page = within(canvasElement.ownerDocument.body)
    await expect(page.getByRole("dialog", { name: "Comparison not yet available" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Close comparison not yet available" })).toBeVisible()
  },
  render: (args) => <Issue136DashboardPrototype args={args as Issue136StoryArgs} />,
}

export const ConsentHintMobile: Story = {
  args: ComparisonNotYetAvailable.args,
  globals: { viewport: { value: "mobile390Tall" } },
  name: "Consent hint · Mobile",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Explain which visits are included" })

    await userEvent.click(trigger)

    const closeButton = within(canvasElement.ownerDocument.body).getByRole("button", {
      name: "Close about these figures",
    })
    const hintPanel = closeButton.closest('[role="dialog"]')
    if (hintPanel?.getAttribute("data-prototype-hint-side") === "sheet") {
      await waitFor(() => expect(closeButton).toHaveFocus())
    }

    await userEvent.click(closeButton)
    await expect(trigger).toHaveFocus()
  },
  render: (args) => <Issue136DashboardPrototype args={args as Issue136StoryArgs} />,
}
