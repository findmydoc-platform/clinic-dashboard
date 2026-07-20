const notificationReadStateKey = "clinic-dashboard-notification-read-state"

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
    // Notification read persistence is optional in the demo experience.
  }
}
