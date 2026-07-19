export type ClinicDashboardNotification = Readonly<{
  createdAt: string
  detail: string
  id: string
  locationId: string
  locationLabel: string
  timestamp: string
  title: string
  type: "message" | "review"
  unread: boolean
}>

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
