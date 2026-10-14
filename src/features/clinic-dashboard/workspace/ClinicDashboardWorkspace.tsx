"use client"

import { useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { AuthenticatedClinicContext } from "@/features/clinic-dashboard/auth/public"
import { useSessionRecoveryCompletion } from "@/features/clinic-dashboard/auth/public"
import {
  createClinicProfileSourceApiCommands,
  createClinicGalleryApiCommands,
  createClinicTreatmentApiCommands,
  createDoctorProfileApiCommands,
} from "@/features/clinic-dashboard/clinic-profile/public"
import type { ClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/public"
import { createReviewSourceApiCommands } from "@/features/clinic-dashboard/reviews/public"
import type { ClinicDashboardReportingLoadState } from "@/features/clinic-dashboard/dashboard/public"
import {
  createNotificationApiCommands,
  type NotificationLoadState,
} from "@/features/clinic-dashboard/notifications/public"
import { ClinicDashboardWorkspaceComposition } from "./ClinicDashboardWorkspaceComposition"
import type { ClinicDashboardWorkspaceInput } from "./model/workspace-input"

export type ClinicDashboardWorkspaceProps = Readonly<{
  authenticatedContext: AuthenticatedClinicContext
  focusInquiryId?: string
  initialReporting?: ClinicDashboardReportingLoadState
  initialNotifications?: NotificationLoadState
  prototypeMode: ClinicDashboardPrototypeMode
  showPrototypeModeToggle?: boolean
  workspaceInput: ClinicDashboardWorkspaceInput
}>

export function ClinicDashboardWorkspace({
  authenticatedContext,
  focusInquiryId,
  initialReporting,
  initialNotifications,
  prototypeMode,
  showPrototypeModeToggle = false,
  workspaceInput,
}: ClinicDashboardWorkspaceProps) {
  useSessionRecoveryCompletion()
  const router = useRouter()
  const [isSourceRefreshPending, startSourceRefresh] = useTransition()
  const doctorProfileCommands = useMemo(() => createDoctorProfileApiCommands(), [])
  const clinicProfileSourceCommands = useMemo(() => createClinicProfileSourceApiCommands(), [])
  const clinicGalleryCommands = useMemo(() => createClinicGalleryApiCommands(), [])
  const notificationCommands = useMemo(() => createNotificationApiCommands(), [])
  const reviewSourceCommands = useMemo(() => createReviewSourceApiCommands(), [])
  const clinicTreatmentCommands = useMemo(() => createClinicTreatmentApiCommands(), [])
  const refreshSources = () => startSourceRefresh(() => router.refresh())

  return (
    <ClinicDashboardWorkspaceComposition
      key={`${authenticatedContext.principal.id}:${authenticatedContext.clinic.id}`}
      authenticatedContext={authenticatedContext}
      clinicGalleryCommands={clinicGalleryCommands}
      clinicProfileSourceCommands={clinicProfileSourceCommands}
      clinicTreatmentCommands={clinicTreatmentCommands}
      doctorProfileCommands={doctorProfileCommands}
      focusInquiryId={focusInquiryId}
      initialReporting={initialReporting}
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
