"use client"

import { useId } from "react"
import { ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type DashboardSummaryState =
  | Readonly<{ status: "ready"; value: string; detail?: string; secondaryText?: string; progress?: number }>
  | Readonly<{ status: "loading"; value?: string; detail?: string }>
  | Readonly<{ status: "unavailable"; value: string; detail?: string; onRetry?: () => void }>

type Action = Readonly<{ kind: "static" }> | Readonly<{ kind: "open"; label: string; onOpen: () => void }>

type Props = Readonly<{ title: string; state: DashboardSummaryState; action: Action; className?: string }>

export function DashboardSummaryCard({ title, state, action, className }: Props) {
  const valueId = useId()
  const detailId = useId()
  const secondaryId = useId()
  const actionId = useId()
  const content = (
    <>
      <span className="block text-sm leading-5 font-bold text-[var(--secondary)] sm:min-h-10">{title}</span>
      {state.status === "loading" && !state.value ? (
        <span
          id={valueId}
          role="status"
          aria-label={`Loading ${title}`}
          aria-busy="true"
          className="mt-2 block h-8"
        >
          <span className="sr-only">Loading</span>
          <span
            aria-hidden="true"
            className="block h-8 w-16 animate-pulse rounded bg-[var(--border)] motion-reduce:animate-none"
          />
        </span>
      ) : (
        <span
          id={valueId}
          className="mt-2 block text-2xl leading-8 font-bold text-[var(--secondary)] tabular-nums"
        >
          {state.value}
        </span>
      )}
      {state.status === "ready" && state.progress !== undefined ? (
        <span
          role="progressbar"
          aria-label={`${title}: ${state.progress}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={state.progress}
          className="mt-3 block h-2 w-full overflow-hidden rounded-full bg-[var(--surface)]"
        >
          <span
            className="block h-full rounded-full bg-[var(--primary)]"
            style={{ width: `${state.progress}%` }}
          />
        </span>
      ) : null}
      {state.detail ? (
        <span id={detailId} className="mt-3 block text-sm leading-5">
          {state.detail}
        </span>
      ) : null}
      {state.status === "ready" && state.secondaryText ? (
        <span id={secondaryId} className="mt-2 block text-xs leading-4">
          {state.secondaryText}
        </span>
      ) : null}
      {action.kind === "open" ? (
        <span
          id={actionId}
          className="mt-auto flex items-center gap-1 pt-4 text-sm leading-5 font-bold text-[var(--primary)]"
        >
          {action.label}
          <ChevronRight aria-hidden="true" className="size-4" />
        </span>
      ) : null}
    </>
  )
  const describedBy = [
    valueId,
    state.detail ? detailId : undefined,
    state.status === "ready" && state.secondaryText ? secondaryId : undefined,
    action.kind === "open" ? actionId : undefined,
  ]
    .filter(Boolean)
    .join(" ")
  return (
    <Card
      className={cn(
        "relative flex h-full min-w-0 flex-col overflow-hidden shadow-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[-3px] has-[:focus-visible]:outline-[var(--primary)]",
        className,
      )}
    >
      {action.kind === "open" ? (
        <button
          type="button"
          aria-label={title}
          aria-describedby={describedBy}
          onClick={action.onOpen}
          className="flex w-full flex-1 flex-col items-start rounded-lg p-4 text-left after:absolute after:inset-0 focus-visible:outline-none"
        >
          {content}
        </button>
      ) : (
        <div className="flex flex-1 flex-col items-start p-4">{content}</div>
      )}
      {state.status === "unavailable" && state.onRetry ? (
        <div className="pointer-events-none relative z-10 px-4 pb-4">
          <Button
            className="pointer-events-auto"
            variant="outline"
            aria-label={`Retry ${title}`}
            onClick={state.onRetry}
          >
            Retry
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
