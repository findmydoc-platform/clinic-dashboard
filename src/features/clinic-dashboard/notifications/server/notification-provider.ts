import "server-only"
import type { NotificationCommands } from "../model/notifications"
export type NotificationProvider = NotificationCommands
export type NotificationProviderFactory = (accessToken: string, clinicId: string) => NotificationProvider
