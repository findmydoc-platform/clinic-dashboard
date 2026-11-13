"use client"

import { DashboardSummaryCard, type DashboardSummaryState } from "./DashboardSummaryCard"
import type { OperationalWorkloadCardState } from "../../model/operational-workload"

export type { OperationalWorkloadCardState } from "../../model/operational-workload"

type OperationalWorkloadCardProps = Readonly<{
  title: string
  state: OperationalWorkloadCardState
  description: string
  emptyDescription: string
  secondaryText?: string
  actionLabel?: string
  onOpen: () => void
  onRetry: () => void
}>

export function OperationalWorkloadCard({
  title,
  state,
  description,
  emptyDescription,
  secondaryText,
  actionLabel,
  onOpen,
  onRetry,
}: OperationalWorkloadCardProps) {
  const presentation: DashboardSummaryState =
    state.status === "ready"
      ? {
          status: "ready",
          value: String(state.count),
          detail: state.count === 0 ? emptyDescription : description,
          secondaryText,
          refreshError:
            state.refreshState === "stale"
              ? { message: "Update failed. Showing previous values.", onRetry }
              : undefined,
        }
      : state.status === "loading"
        ? { status: "loading" }
        : { status: "unavailable", value: "Unavailable", onRetry }
  return (
    <DashboardSummaryCard
      title={title}
      state={presentation}
      action={{
        kind: "open",
        label: actionLabel ?? `View ${title.replace(/^Open /, "").toLowerCase()}`,
        onOpen,
      }}
    />
  )
}
