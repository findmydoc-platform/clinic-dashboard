export type ClinicDashboardNotificationTarget =
  Readonly<{ kind: "messages" }> | Readonly<{ kind: "review"; reviewId: string }>

export type ClinicDashboardNotification = Readonly<{
  createdAt: string
  detail: string
  id: string
  locationId: string
  locationLabel: string
  timestamp: string
  target: ClinicDashboardNotificationTarget
  title: string
  type: "message" | "review"
  unread: boolean
}>

export type ClinicDashboardNotificationTargetIndex = Readonly<
  Record<
    string,
    Readonly<{
      reviewIds: readonly string[]
    }>
  >
>

export function getUnreadNotifications(
  notifications: readonly ClinicDashboardNotification[],
  readNotificationIds: readonly string[],
) {
  const readIds = new Set(readNotificationIds)

  return [...notifications]
    .filter((notification) => notification.unread && !readIds.has(notification.id))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export function markAllNotificationsAsRead(
  notifications: readonly ClinicDashboardNotification[],
  readNotificationIds: readonly string[],
) {
  const readIds = new Set(readNotificationIds)

  notifications.forEach((notification) => {
    if (notification.unread) readIds.add(notification.id)
  })

  return [...readIds]
}

export function markNotificationAsRead(notificationId: string, readNotificationIds: readonly string[]) {
  return readNotificationIds.includes(notificationId)
    ? readNotificationIds
    : [...readNotificationIds, notificationId]
}

export function assertClinicDashboardNotificationTargets(
  notifications: readonly ClinicDashboardNotification[],
  targetsByLocation: ClinicDashboardNotificationTargetIndex,
) {
  notifications.forEach((notification) => {
    const locationTargets = targetsByLocation[notification.locationId]
    if (!locationTargets) {
      throw new Error(`Notification ${notification.id} references an unknown location.`)
    }

    const targetExists =
      notification.target.kind === "messages"
        ? true
        : locationTargets.reviewIds.includes(notification.target.reviewId)

    if (!targetExists) {
      throw new Error(`Notification ${notification.id} references an unknown ${notification.target.kind}.`)
    }
  })
}
