import type { ClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/public"
import { markAllNotificationsAsRead, type ClinicDashboardNotification } from "./model/notifications"

const prototypeModeKey = "clinic-dashboard-interface-mode"
const prototypeModeChangeEvent = "clinic-dashboard-interface-mode-change"
const notificationReadStateKey = "clinic-dashboard-notification-read-state"
const notificationReadStateChangeEvent = "clinic-dashboard-notification-read-state-change"

function subscribeToSessionValue(eventName: string, onStoreChange: () => void) {
  window.addEventListener(eventName, onStoreChange)
  window.addEventListener("storage", onStoreChange)

  return () => {
    window.removeEventListener(eventName, onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
}

export function getStoredPrototypeMode(): ClinicDashboardPrototypeMode {
  return window.sessionStorage.getItem(prototypeModeKey) === "visual-reference"
    ? "visual-reference"
    : "presentation"
}

export function getServerPrototypeMode(): ClinicDashboardPrototypeMode {
  return "presentation"
}

export function subscribeToPrototypeMode(onStoreChange: () => void) {
  return subscribeToSessionValue(prototypeModeChangeEvent, onStoreChange)
}

export function storePrototypeMode(prototypeMode: ClinicDashboardPrototypeMode) {
  window.sessionStorage.setItem(prototypeModeKey, prototypeMode)
  window.dispatchEvent(new Event(prototypeModeChangeEvent))
}

export function getStoredNotificationReadState() {
  try {
    return window.sessionStorage.getItem(notificationReadStateKey) ?? "[]"
  } catch {
    return "[]"
  }
}

export function getServerNotificationReadState() {
  return "[]"
}

export function subscribeToNotificationReadState(onStoreChange: () => void) {
  return subscribeToSessionValue(notificationReadStateChangeEvent, onStoreChange)
}

export function parseNotificationReadIds(value: string) {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []
  } catch {
    return []
  }
}

export function storeAllNotificationsRead(
  notifications: readonly ClinicDashboardNotification[],
  currentReadIds: readonly string[],
) {
  try {
    const nextReadIds = markAllNotificationsAsRead(notifications, currentReadIds)
    window.sessionStorage.setItem(notificationReadStateKey, JSON.stringify(nextReadIds))
    window.dispatchEvent(new Event(notificationReadStateChangeEvent))
  } catch {
    // Session persistence is an optional enhancement for the current prototype.
  }
}
