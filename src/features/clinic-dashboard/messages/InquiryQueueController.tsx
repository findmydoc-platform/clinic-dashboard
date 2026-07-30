"use client"

import { useEffect, useMemo, useRef } from "react"
import { createInquiryStatusApiCommands } from "./browser/inquiry-status-api"
import { InquiryQueueScreen } from "./components/organisms/InquiryQueueScreen"
import { useInquiryQueueController } from "./hooks/useInquiryQueueController"
import type { InquiryStatusCommands } from "./model/inquiry-status-commands"
import type { PatientInquiryQueueSnapshot } from "./model/inquiries"

export type InquiryQueueProps = Readonly<{
  commands?: InquiryStatusCommands
  focusHeading?: boolean
  focusInquiryId?: string
  onFocusHandled?: () => void
  snapshot: PatientInquiryQueueSnapshot
}>

export function InquiryQueue({
  commands,
  focusHeading,
  focusInquiryId,
  onFocusHandled,
  snapshot,
}: InquiryQueueProps) {
  const liveCommands = useMemo(() => createInquiryStatusApiCommands(), [])
  const controller = useInquiryQueueController({
    commands: commands ?? liveCommands,
    snapshot,
  })
  const handledTargetRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!focusInquiryId) {
      handledTargetRef.current = undefined
      return
    }
    if (handledTargetRef.current === focusInquiryId) return
    if (!snapshot.inquiries.some(({ id }) => id === focusInquiryId)) {
      onFocusHandled?.()
      return
    }

    handledTargetRef.current = focusInquiryId
    controller.actions.onInquirySelect(focusInquiryId)
  }, [controller.actions, focusInquiryId, onFocusHandled, snapshot.inquiries])

  return (
    <InquiryQueueScreen
      actions={controller.actions}
      focusHeading={focusHeading}
      focusInquiryId={focusInquiryId}
      model={controller.model}
      onFocusHandled={onFocusHandled}
    />
  )
}
