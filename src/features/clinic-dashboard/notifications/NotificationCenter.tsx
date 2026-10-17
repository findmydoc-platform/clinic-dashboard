"use client"
import type {
  NotificationCommands,
  NotificationLoadState,
  NotificationDestinationOpen,
} from "./model/notifications"
import { useNotificationCenterController } from "./hooks/useNotificationCenterController"
import { NotificationCenterPanel } from "./components/organisms/NotificationCenterPanel"

export type NotificationCenterController = ReturnType<typeof useNotificationCenterController>

type NotificationCenterProps = Readonly<{
  controller?: NotificationCenterController
  onDestinationOpen?: NotificationDestinationOpen
  commands: NotificationCommands
  initialState: NotificationLoadState
  open: boolean
  onOpenChange: (open: boolean) => void
}>
function LocalNotificationCenter({
  commands,
  initialState,
  open,
  onOpenChange,
  onDestinationOpen,
}: NotificationCenterProps) {
  const { model, actions } = useNotificationCenterController(commands, initialState, open, onDestinationOpen)
  return <NotificationCenterPanel model={model} actions={actions} open={open} onOpenChange={onOpenChange} />
}

export function NotificationCenter(props: NotificationCenterProps) {
  if (props.controller)
    return (
      <NotificationCenterPanel
        model={props.controller.model}
        actions={props.controller.actions}
        open={props.open}
        onOpenChange={props.onOpenChange}
      />
    )
  return <LocalNotificationCenter {...props} />
}
