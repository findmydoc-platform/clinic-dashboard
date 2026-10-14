"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { reauthenticateClinicDashboardSession } from "@/features/clinic-dashboard/auth/public"
import { createInquiryStatusApiCommands } from "./browser/inquiry-status-api"
import { InquiryQueueScreen } from "./components/organisms/InquiryQueueScreen"
import { useInquiryQueueController } from "./hooks/useInquiryQueueController"
import type { InquiryWorkspaceCommands } from "./model/inquiry-status-commands"
import type { PatientInquiryQueueSnapshot } from "./model/inquiries"

import type { InquiryOpeningRequest, InquiryOpeningResult } from "./model/inquiry-opening"

export type InquiryQueueProps = Readonly<{
  openingRequest?: InquiryOpeningRequest
  onOpeningResult?: (result: InquiryOpeningResult) => void
  commands?: InquiryWorkspaceCommands
  focusHeading?: boolean
  focusInquiryId?: string
  isActive: boolean
  onFocusHandled?: () => void
  onDraftPresenceChange?: (hasUnsavedDrafts: boolean) => void
  onSessionLost?: (inquiryId?: string) => void
  onUnreadCountChange?: (unreadCount: number) => void
  snapshot: PatientInquiryQueueSnapshot
}>

export function InquiryQueue({
  commands,
  openingRequest,
  onOpeningResult,
  focusHeading,
  focusInquiryId,
  isActive,
  onFocusHandled,
  onDraftPresenceChange,
  onSessionLost,
  onUnreadCountChange,
  snapshot,
}: InquiryQueueProps) {
  const liveCommands = useMemo(() => createInquiryStatusApiCommands(), [])
  const controller = useInquiryQueueController({
    commands: commands ?? liveCommands,
    isActive,
    onSessionLost,
    reauthenticateSession: reauthenticateClinicDashboardSession,
    snapshot,
  })
  const [loadedOpening, setLoadedOpening] = useState<InquiryOpeningRequest>()
  const openingGenerationRef = useRef(0)
  const openInquiryRef = useRef(controller.openInquiry)
  useEffect(() => {
    openInquiryRef.current = controller.openInquiry
  }, [controller.openInquiry])
  useEffect(() => {
    const generation = ++openingGenerationRef.current
    if (!openingRequest || !isActive) return
    void openInquiryRef
      .current(openingRequest.inquiryId)
      .then((loaded) => {
        if (generation !== openingGenerationRef.current) return
        if (loaded) setLoadedOpening(openingRequest)
        else onOpeningResult?.({ ...openingRequest, status: "unavailable" })
      })
      .catch(() => {
        if (generation === openingGenerationRef.current)
          onOpeningResult?.({
            requestId: openingRequest.requestId,
            inquiryId: openingRequest.inquiryId,
            status: "unavailable",
          })
      })
    return () => {
      openingGenerationRef.current += 1
    }
  }, [openingRequest, isActive, onOpeningResult])
  const handledTargetRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    onDraftPresenceChange?.(controller.model.hasUnsavedDrafts)
  }, [controller.model.hasUnsavedDrafts, onDraftPresenceChange])

  useEffect(() => {
    onUnreadCountChange?.(controller.model.totalUnreadCount)
  }, [controller.model.totalUnreadCount, onUnreadCountChange])

  useEffect(
    () => () => {
      onDraftPresenceChange?.(false)
    },
    [onDraftPresenceChange],
  )

  useEffect(() => {
    if (!focusInquiryId) {
      handledTargetRef.current = undefined
      return
    }
    if (handledTargetRef.current === focusInquiryId) return

    handledTargetRef.current = focusInquiryId
    void controller.actions.onInquirySelect(focusInquiryId)
  }, [controller.actions, focusInquiryId])

  return (
    <InquiryQueueScreen
      actions={controller.actions}
      focusHeading={focusHeading}
      focusInquiryId={focusInquiryId}
      model={controller.model}
      onFocusHandled={onFocusHandled}
      openingRequest={
        isActive && loadedOpening?.requestId === openingRequest?.requestId ? loadedOpening : undefined
      }
      onOpeningResult={onOpeningResult}
    />
  )
}
