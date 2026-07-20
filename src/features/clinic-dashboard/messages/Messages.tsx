"use client"

import { useEffect, useRef } from "react"
import { MessagesScreen } from "./components/organisms/MessagesScreen"
import { PatientInquiryProfileDialog } from "./components/organisms/PatientInquiryProfileDialog"
import { useMessagesController } from "./hooks/useMessagesController"
import type { MessageCommands } from "./model/message-commands"
import type { MessageFocusTarget, MessagesSnapshot, PatientInquiryProfile } from "./model/messages"

export type MessagesProps = Readonly<{
  focusTarget?: MessageFocusTarget
  initialInquiryOpen?: boolean
  inquiry: PatientInquiryProfile
  isInteractive: boolean
  messageCommands: MessageCommands
  onFocusHandled?: () => void
  snapshot: MessagesSnapshot
}>

export function Messages({
  focusTarget,
  initialInquiryOpen,
  inquiry,
  isInteractive,
  messageCommands,
  onFocusHandled,
  snapshot,
}: MessagesProps) {
  const controller = useMessagesController({
    initialInquiryOpen,
    inquiry,
    isInteractive,
    messageCommands,
    snapshot,
  })
  const handledTargetRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const conversationId = focusTarget?.conversationId
    if (!conversationId) {
      handledTargetRef.current = undefined
      return
    }
    if (handledTargetRef.current === conversationId) return

    handledTargetRef.current = conversationId
    controller.actions.onConversationSelect(conversationId)
  }, [controller.actions, focusTarget?.conversationId])

  return (
    <>
      <MessagesScreen
        actions={{
          ...controller.actions,
          onPatientInquiryOpen: () => controller.actions.onInquiryOpenChange(true),
        }}
        focusTarget={focusTarget}
        model={controller.model}
        onFocusHandled={onFocusHandled}
      />
      <PatientInquiryProfileDialog
        onOpenChange={controller.actions.onInquiryOpenChange}
        open={controller.inquiryModel.isOpen}
        patient={controller.inquiryModel.inquiry}
      />
    </>
  )
}
