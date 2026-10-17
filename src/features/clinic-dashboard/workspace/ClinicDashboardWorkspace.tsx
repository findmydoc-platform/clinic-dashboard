"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
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
  const activeScope = useRef(scope)
  const [restrictedScope, setRestrictedScope] = useState<string>()
  useEffect(() => {
    activeScope.current = scope
  }, [scope])
  const loadReporting = useCallback(
    (days: ClinicDashboardReportingPeriodDays) =>
      loadClinicDashboardReportingFromBrowser(authenticatedContext.clinic.id, days, fetch, (failure) => {
        if (activeScope.current !== scope) return
        setRestrictedScope(scope)
        router.replace(
          failure === "unauthorized"
            ? "/auth/session/recover?mode=refresh&attempt="
            : "/access?state=restricted",
        )
      }),
    [authenticatedContext.clinic.id, router, scope],
  )
  useEffect(() => {
    if (authorizedClinics)
      rememberAuthorizedClinic(authenticatedContext.principal.id, authenticatedContext.clinic.id)
  }, [authorizedClinics, authenticatedContext.principal.id, authenticatedContext.clinic.id])
  const [isSourceRefreshPending, startSourceRefresh] = useTransition()
  const doctorProfileCommands = useMemo(
    () => createDoctorProfileApiCommands(authenticatedContext.clinic.id),
    [authenticatedContext.clinic.id],
  )
  const clinicProfileSourceCommands = useMemo(() => createClinicProfileSourceApiCommands(), [])
  const clinicGalleryCommands = useMemo(() => createClinicGalleryApiCommands(), [])
  const notificationCommands = useMemo(() => createNotificationApiCommands(), [])
  const reviewSourceCommands = useMemo(
    () => createReviewSourceApiCommands(authenticatedContext.clinic.id),
    [authenticatedContext.clinic.id],
  )
  const clinicTreatmentCommands = useMemo(() => createClinicTreatmentApiCommands(), [])
  const refreshSources = () => startSourceRefresh(() => router.refresh())

  if (restrictedScope === scope) return <p role="alert">Clinic access is no longer available.</p>
  return (
    <ClinicDashboardWorkspaceComposition
      key={`${authenticatedContext.principal.id}:${authenticatedContext.clinic.id}`}
      authenticatedContext={authenticatedContext}
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
