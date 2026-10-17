"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { AuthenticatedClinicContext, AuthorizedClinic } from "@/features/clinic-dashboard/auth/public"
import { useSessionRecoveryCompletion } from "@/features/clinic-dashboard/auth/public"
import {
  createClinicProfileSourceApiCommands,
  createClinicGalleryApiCommands,
  createClinicTreatmentApiCommands,
  createDoctorProfileApiCommands,
} from "@/features/clinic-dashboard/clinic-profile/public"
import type { ClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/public"
import { createReviewSourceApiCommands } from "@/features/clinic-dashboard/reviews/public"
import {
  loadClinicDashboardReportingFromBrowser,
  type ClinicDashboardReportingPeriodDays,
  type ClinicDashboardReportingLoadState,
} from "@/features/clinic-dashboard/dashboard/public"
import {
  createNotificationApiCommands,
  type NotificationLoadState,
} from "@/features/clinic-dashboard/notifications/public"
import { ClinicDashboardWorkspaceComposition } from "./ClinicDashboardWorkspaceComposition"
import { rememberAuthorizedClinic } from "./browser/clinic-preference"
import type { ClinicDashboardSection } from "./model/workspace"
import type { ClinicDashboardWorkspaceInput } from "./model/workspace-input"
import { useEditorDepartureGuard } from "./useEditorDepartureGuard"
import { useClinicAccessRecovery } from "./useClinicAccessRecovery"
import { ClinicAccessRecoveryScreen } from "./components/organisms/ClinicAccessRecoveryScreen"

export type ClinicDashboardWorkspaceProps = Readonly<{
  authenticatedContext: AuthenticatedClinicContext
  authorizedClinics?: readonly AuthorizedClinic[]
  initialSection?: ClinicDashboardSection
  selectionNotice?: string
  focusInquiryId?: string
  initialReporting?: ClinicDashboardReportingLoadState
  initialNotifications?: NotificationLoadState
  prototypeMode: ClinicDashboardPrototypeMode
  showPrototypeModeToggle?: boolean
  workspaceInput: ClinicDashboardWorkspaceInput
}>

export function ClinicDashboardWorkspace({
  authenticatedContext,
  authorizedClinics,
  initialSection,
  selectionNotice,
  focusInquiryId,
  initialReporting,
  initialNotifications,
  prototypeMode,
  showPrototypeModeToggle = false,
  workspaceInput,
}: ClinicDashboardWorkspaceProps) {
  useSessionRecoveryCompletion()
  const router = useRouter()
  const scope = `${authenticatedContext.principal.id}:${authenticatedContext.clinic.id}`
  const activeScope = useRef<string | undefined>(scope)
  const departureGuard = useEditorDepartureGuard()
  const [section, setSection] = useState<ClinicDashboardSection>(initialSection ?? "dashboard")
  const changeClinic = (clinicId: string, nextSection: ClinicDashboardSection) =>
    router.push(`/clinics/${encodeURIComponent(clinicId)}?section=${nextSection}`)
  const clearProtection = departureGuard.clearProtection
  const recoverSession = useCallback(() => {
    clearProtection()
    router.replace("/auth/session/recover?mode=refresh&attempt=")
  }, [clearProtection, router])
  const recovery = useClinicAccessRecovery({
    principalId: authenticatedContext.principal.id,
    clinicId: authenticatedContext.clinic.id,
    section,
    guard: departureGuard,
    onChoose: changeClinic,
    onSessionLost: recoverSession,
  })
  useLayoutEffect(() => {
    activeScope.current = scope
    return () => {
      activeScope.current = undefined
    }
  }, [scope])
  const restrict = recovery.restrict
  const handleDomainAccessFailure = useCallback(
    (failure: "unauthorized" | "forbidden") => {
      if (activeScope.current !== scope) return
      if (failure === "unauthorized") recoverSession()
      else void restrict()
    },
    [recoverSession, restrict, scope],
  )
  const loadReporting = useCallback(
    (days: ClinicDashboardReportingPeriodDays) =>
      loadClinicDashboardReportingFromBrowser(authenticatedContext.clinic.id, days, fetch, (failure) => {
        if (activeScope.current !== scope) return
        if (failure === "unauthorized") recoverSession()
        else void restrict()
      }),
    [authenticatedContext.clinic.id, recoverSession, restrict, scope],
  )
  useEffect(() => {
    if (authorizedClinics)
      rememberAuthorizedClinic(authenticatedContext.principal.id, authenticatedContext.clinic.id)
  }, [authorizedClinics, authenticatedContext.principal.id, authenticatedContext.clinic.id])
  const [isSourceRefreshPending, startSourceRefresh] = useTransition()
  const doctorProfileCommands = useMemo(() => createDoctorProfileApiCommands(), [])
  const clinicProfileSourceCommands = useMemo(() => {
    // The factory stores the scope-bound callback; asynchronous source failures invoke it.
    // eslint-disable-next-line react-hooks/refs
    return createClinicProfileSourceApiCommands(authenticatedContext.clinic.id, handleDomainAccessFailure)
  }, [authenticatedContext.clinic.id, handleDomainAccessFailure])
  const clinicGalleryCommands = useMemo(() => createClinicGalleryApiCommands(), [])
  const notificationCommands = useMemo(() => createNotificationApiCommands(), [])
  const reviewSourceCommands = useMemo(() => {
    // The factory stores this callback; only asynchronous command failures invoke it.
    // eslint-disable-next-line react-hooks/refs
    return createReviewSourceApiCommands(authenticatedContext.clinic.id, handleDomainAccessFailure)
  }, [authenticatedContext.clinic.id, handleDomainAccessFailure])
  const clinicTreatmentCommands = useMemo(() => {
    // The command factory stores this callback for source responses; it does not call it during render.
    // eslint-disable-next-line react-hooks/refs
    return createClinicTreatmentApiCommands(authenticatedContext.clinic.id, handleDomainAccessFailure)
  }, [authenticatedContext.clinic.id, handleDomainAccessFailure])
  const refreshSources = () => startSourceRefresh(() => router.refresh())

  if (recovery.model.restricted)
    return (
      <ClinicAccessRecoveryScreen
        model={recovery.model}
        onChoose={recovery.chooseClinic}
        onRefresh={() => void recovery.refreshChoices()}
        onDeclineDiscard={recovery.declineDiscard}
        onConfirmDiscard={() => void recovery.confirmDiscard()}
      />
    )
  return (
    <ClinicDashboardWorkspaceComposition
      key={`${authenticatedContext.principal.id}:${authenticatedContext.clinic.id}`}
      authenticatedContext={authenticatedContext}
      departureGuard={departureGuard}
      onSectionChange={setSection}
      onAccessLost={() => void restrict()}
      authorizedClinics={authorizedClinics}
      selectionNotice={selectionNotice}
      start={{ section: initialSection }}
      onClinicChange={(clinicId, section) =>
        startSourceRefresh(() => router.push(`/clinics/${encodeURIComponent(clinicId)}?section=${section}`))
      }
      clinicGalleryCommands={clinicGalleryCommands}
      clinicProfileSourceCommands={clinicProfileSourceCommands}
      clinicTreatmentCommands={clinicTreatmentCommands}
      doctorProfileCommands={doctorProfileCommands}
      focusInquiryId={focusInquiryId}
      initialReporting={initialReporting}
      loadReporting={loadReporting}
      isSourceRefreshPending={isSourceRefreshPending}
      onSourceRefresh={refreshSources}
      initialNotifications={initialNotifications}
      notificationCommands={notificationCommands}
      prototypeMode={prototypeMode}
      reviewCommands={reviewSourceCommands}
      showPrototypeModeToggle={showPrototypeModeToggle}
      workspaceInput={workspaceInput}
    />
  )
}
