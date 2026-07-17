import type { ClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/public"

const prototypeModeKey = "clinic-dashboard-interface-mode"
const notificationReadStateKey = "clinic-dashboard-notification-read-state"

export function getStoredPrototypeMode(): ClinicDashboardPrototypeMode | undefined {
  try {
    const value = window.sessionStorage.getItem(prototypeModeKey)
    return value === "presentation" || value === "visual-reference" ? value : undefined
  } catch {
    return undefined
  }
}

export function storePrototypeMode(prototypeMode: ClinicDashboardPrototypeMode) {
  try {
    window.sessionStorage.setItem(prototypeModeKey, prototypeMode)
  } catch {
    // Session persistence is an optional enhancement for the current prototype.
  }
}

export function getStoredNotificationReadState(): string | undefined {
  try {
    return window.sessionStorage.getItem(notificationReadStateKey) ?? undefined
  } catch {
    return undefined
  }
}

export function parseNotificationReadIds(value: string | undefined): readonly string[] | undefined {
  if (value === undefined) return undefined

  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : undefined
  } catch {
    return undefined
  }
}

export function storeNotificationReadIds(readIds: readonly string[]) {
  try {
    window.sessionStorage.setItem(notificationReadStateKey, JSON.stringify(readIds))
  } catch {
    // Session persistence is an optional enhancement for the current prototype.
  }
}
