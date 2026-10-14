"use client"
import type {
  NotificationCommands,
  NotificationLoadState,
  NotificationDestinationOpen,
} from "./model/notifications"
import { useNotificationCenterController } from "./hooks/useNotificationCenterController"
import { NotificationCenterPanel } from "./components/organisms/NotificationCenterPanel"

type NotificationCenterProps = Readonly<{
  onDestinationOpen?: NotificationDestinationOpen
  commands: NotificationCommands
  initialState: NotificationLoadState
  open: boolean
  onOpenChange: (open: boolean) => void
}>
export function NotificationCenter({
  commands,
  initialState,
  open,
  onOpenChange,
  onDestinationOpen,
}: NotificationCenterProps) {
  const { model, actions } = useNotificationCenterController(commands, initialState, open, onDestinationOpen)
  return <NotificationCenterPanel model={model} actions={actions} open={open} onOpenChange={onOpenChange} />
}
