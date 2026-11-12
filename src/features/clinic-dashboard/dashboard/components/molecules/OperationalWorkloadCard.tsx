"use client"

import { useId } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export type OperationalWorkloadCardState =
  Readonly<{ status: "loading" | "unavailable" }> | Readonly<{ status: "ready"; count: number }>

type OperationalWorkloadCardProps = Readonly<{
  title: string
  state: OperationalWorkloadCardState
  description: string
  emptyDescription: string
  secondaryText?: string
  onOpen: () => void
  onRetry: () => void
}>

export function OperationalWorkloadCard({
  title,
  state,
  description,
  emptyDescription,
  secondaryText,
  onOpen,
  onRetry,
}: OperationalWorkloadCardProps) {
  const valueId = useId()
  const descriptionId = useId()
  const secondaryId = useId()
  return (
    <Card className="min-w-0 overflow-hidden shadow-none">
      <button
        type="button"
        aria-label={title}
        aria-describedby={[
          valueId,
          state.status === "ready" ? descriptionId : undefined,
          state.status === "ready" && secondaryText ? secondaryId : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onOpen}
        className="flex min-h-24 w-full flex-col items-start gap-2 rounded-lg p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--primary)]"
      >
        <span className="text-sm font-bold text-[var(--secondary)]">{title}</span>
        {state.status === "loading" ? (
          <span id={valueId} role="status" aria-label={`Loading ${title}`} aria-busy="true">
            <span className="sr-only">Loading</span>
            <span
              aria-hidden="true"
              className="block h-8 w-16 animate-pulse rounded bg-[var(--border)] motion-reduce:animate-none"
            />
          </span>
        ) : (
          <span id={valueId} className="text-2xl font-bold text-[var(--secondary)]">
            {state.status === "ready" ? state.count : "Unavailable"}
          </span>
        )}
        {state.status === "ready" ? (
          <span id={descriptionId} className="text-sm">
            {state.count === 0 ? emptyDescription : description}
          </span>
        ) : null}
        {state.status === "ready" && secondaryText ? (
          <span id={secondaryId} className="text-xs">
            {secondaryText}
          </span>
        ) : null}
      </button>
      {state.status === "unavailable" ? (
        <div className="px-4 pb-4">
          <Button variant="outline" aria-label={`Retry ${title}`} onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
