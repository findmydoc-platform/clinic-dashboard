"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
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
  clinicId: string
  commands?: InquiryWorkspaceCommands
  focusHeading?: boolean
  focusInquiryId?: string
  isActive: boolean
  onFocusHandled?: () => void
  onNavigationRequestChange?: (
    request:
      | ((
          continuation: () => void,
          onCancel?: () => void,
          intent?: "context-change" | "destination" | "section",
        ) => void)
      | null,
  ) => void
  onDraftPresenceChange?: (hasUnsavedDrafts: boolean) => void
  onSessionLost?: (inquiryId?: string) => void
  onUnreadCountChange?: (unreadCount: number) => void
  snapshot: PatientInquiryQueueSnapshot
}>

export function InquiryQueue({
  commands,
  clinicId,
  openingRequest,
  onOpeningResult,
  focusHeading,
  focusInquiryId,
  isActive,
  onFocusHandled,
  onDraftPresenceChange,
  onNavigationRequestChange,
  onSessionLost,
  onUnreadCountChange,
  snapshot,
}: InquiryQueueProps) {
  const liveCommands = useMemo(() => createInquiryStatusApiCommands(clinicId), [clinicId])
  const controller = useInquiryQueueController({
    clinicId,
    commands: commands ?? liveCommands,
    isActive,
    onSessionLost,
    reauthenticateSession: reauthenticateClinicDashboardSession,
    snapshot,
  })
  const [departureOpen, setDepartureOpen] = useState(false)
  const stayButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!departureOpen) return
    const frame = requestAnimationFrame(() => stayButtonRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [departureOpen])
  const pendingDeparture = useRef<{ continuation: () => void; onCancel?: () => void } | undefined>(undefined)
  const cancelDeparture = useCallback(() => {
    const pending = pendingDeparture.current
    pendingDeparture.current = undefined
    setDepartureOpen(false)
    pending?.onCancel?.()
  }, [])
  const requestNavigation = useCallback(
    (
      continuation: () => void,
      onCancel?: () => void,
      intent?: "context-change" | "destination" | "section",
    ) => {
      cancelDeparture()
      if (!controller.model.hasUnsavedDrafts) {
        continuation()
        return
      }
      if (intent !== "context-change") {
        if (
          window.confirm(
            "Open this destination? Your unsent replies, internal notes and attachments will be kept.",
          )
        )
          continuation()
        else onCancel?.()
        return
      }
      pendingDeparture.current = { continuation, onCancel }
      setDepartureOpen(true)
    },
    [cancelDeparture, controller.model.hasUnsavedDrafts],
  )
  useEffect(() => {
    onNavigationRequestChange?.(requestNavigation)
    return () => onNavigationRequestChange?.(null)
  }, [onNavigationRequestChange, requestNavigation])
  useEffect(
    () => () => {
      pendingDeparture.current?.onCancel?.()
      pendingDeparture.current = undefined
    },
    [],
  )
  const discardAndContinue = () => {
    if (!controller.discardUnfinishedWork()) return
    const pending = pendingDeparture.current
    pendingDeparture.current = undefined
    setDepartureOpen(false)
    pending?.continuation()
  }
  const [loadedOpening, setLoadedOpening] = useState<InquiryOpeningRequest>()
  const openingGenerationRef = useRef(0)
  const openInquiryRef = useRef(controller.openInquiry)
  useEffect(() => {
    openInquiryRef.current = controller.openInquiry
  }, [controller.openInquiry])
  useEffect(() => {
    const generation = ++openingGenerationRef.current
    if (!openingRequest || !isActive) return
    if (openingRequest.clinicId && openingRequest.clinicId !== clinicId) {
      onOpeningResult?.({ ...openingRequest, status: "unavailable" })
      return
    }
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
  }, [openingRequest, isActive, onOpeningResult, clinicId])
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
    <>
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
      <AlertDialog
        open={departureOpen}
        onOpenChange={(open) => {
          if (!open) cancelDeparture()
        }}
        title="Leave unfinished inquiries?"
        description="Unsent replies, internal notes and pending attachments belong to the current clinic. Stay to finish them, or discard them before continuing."
        actions={
          <>
            <Button ref={stayButtonRef} onClick={cancelDeparture} variant="outline">
              Keep editing
            </Button>
            <Button onClick={discardAndContinue} variant="destructive">
              Discard and continue
            </Button>
          </>
        }
      />
    </>
  )
}
