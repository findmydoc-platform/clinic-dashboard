"use client"
import type { NotificationCommands, NotificationLoadState } from "./model/notifications"
import { useNotificationCenterController } from "./hooks/useNotificationCenterController"
import { NotificationCenterPanel } from "./components/organisms/NotificationCenterPanel"

type NotificationCenterProps = Readonly<{
  commands: NotificationCommands
  initialState: NotificationLoadState
  open: boolean
  onOpenChange: (open: boolean) => void
}>
export function NotificationCenter({ commands, initialState, open, onOpenChange }: NotificationCenterProps) {
  const { model, actions } = useNotificationCenterController(commands, initialState, open)
  return <NotificationCenterPanel model={model} actions={actions} open={open} onOpenChange={onOpenChange} />
}
