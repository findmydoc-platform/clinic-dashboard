import {
  isClinicDashboardReportingPeriodDays,
  type ClinicDashboardReportingPeriodDays,
} from "../model/clinic-dashboard-reporting"
import type { DashboardJourneyStageId } from "../model/dashboard-overview"

export type DashboardReportingSelection = Readonly<{
  periodDays: ClinicDashboardReportingPeriodDays
  metricId: DashboardJourneyStageId
}>

const storageKey = "fmd-dashboard-reporting-selection"
const selectionChanged = "fmd-dashboard-reporting-selection-changed"
const metricIds: readonly DashboardJourneyStageId[] = [
  "impressions",
  "profileViews",
  "uniqueVisitors",
  "contacts",
  "inquiries",
]

export function readReportingSelectionSnapshot(): string | null {
  try {
    return window.sessionStorage.getItem(storageKey)
  } catch {
    return null
  }
}

export function subscribeReportingSelection(onChange: () => void) {
  window.addEventListener(selectionChanged, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(selectionChanged, onChange)
    window.removeEventListener("storage", onChange)
  }
}

export function parseReportingSelection(
  scope: string | undefined,
  snapshot: string | null,
): DashboardReportingSelection | undefined {
  if (!scope || !snapshot) return undefined
  try {
    const value: unknown = JSON.parse(snapshot)
    if (!value || typeof value !== "object") return undefined
    const candidate = value as Record<string, unknown>
    if (
      candidate.scope !== scope ||
      typeof candidate.periodDays !== "number" ||
      !isClinicDashboardReportingPeriodDays(candidate.periodDays) ||
      !metricIds.some((id) => id === candidate.metricId)
    )
      return undefined
    return {
      periodDays: candidate.periodDays,
      metricId: candidate.metricId as DashboardJourneyStageId,
    }
  } catch {
    return undefined
  }
}

export function rememberReportingSelection(
  scope: string | undefined,
  selection: DashboardReportingSelection,
) {
  if (!scope) return
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify({ scope, ...selection }))
    window.dispatchEvent(new Event(selectionChanged))
  } catch {
    // Reporting remains usable when this tab cannot persist its display preferences.
  }
}
