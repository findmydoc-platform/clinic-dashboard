"use client"

import { MessagesScreen } from "./components/organisms/MessagesScreen"
import { useMessagesController } from "./hooks/useMessagesController"
import type { MessagesSnapshot } from "./model/messages"

export type MessagesProps = Readonly<{
  isInteractive: boolean
  onPatientInquiryOpen: () => void
  snapshot: MessagesSnapshot
}>

export function Messages({ isInteractive, onPatientInquiryOpen, snapshot }: MessagesProps) {
  const controller = useMessagesController({ isInteractive, snapshot })

  return <MessagesScreen actions={{ ...controller.actions, onPatientInquiryOpen }} model={controller.model} />
}
