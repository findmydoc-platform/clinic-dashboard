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
