"use client"

import { useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClinicDashboardDemoClientAdapter } from "@/features/clinic-dashboard/demo/commands"
import type { AuthenticatedClinicContext } from "@/features/clinic-dashboard/auth/public"
import {
  createClinicProfileSourceApiCommands,
  createClinicGalleryApiCommands,
  createClinicTreatmentApiCommands,
  createDoctorProfileApiCommands,
} from "@/features/clinic-dashboard/clinic-profile/public"
import type { ClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/public"
import { createReviewSourceApiCommands } from "@/features/clinic-dashboard/reviews/public"
import { ClinicDashboardWorkspaceComposition } from "./ClinicDashboardWorkspaceComposition"
import type { ClinicDashboardWorkspaceInput } from "./model/workspace-input"

export type ClinicDashboardWorkspaceProps = Readonly<{
  authenticatedContext: AuthenticatedClinicContext
  persistNotificationReadStateInSession?: boolean
  prototypeMode: ClinicDashboardPrototypeMode
  showPrototypeModeToggle?: boolean
  workspaceInput: ClinicDashboardWorkspaceInput
}>

export function ClinicDashboardWorkspace({
  authenticatedContext,
  persistNotificationReadStateInSession = false,
  prototypeMode,
  showPrototypeModeToggle = false,
  workspaceInput,
}: ClinicDashboardWorkspaceProps) {
  const router = useRouter()
  const [isSourceRefreshPending, startSourceRefresh] = useTransition()
  const demoClientAdapter = useMemo(() => createClinicDashboardDemoClientAdapter(), [])
  const doctorProfileCommands = useMemo(() => createDoctorProfileApiCommands(), [])
  const clinicProfileSourceCommands = useMemo(() => createClinicProfileSourceApiCommands(), [])
  const clinicGalleryCommands = useMemo(() => createClinicGalleryApiCommands(), [])
  const reviewSourceCommands = useMemo(() => createReviewSourceApiCommands(), [])
  const clinicTreatmentCommands = useMemo(() => createClinicTreatmentApiCommands(), [])
  const refreshSources = () => startSourceRefresh(() => router.refresh())

  return (
    <ClinicDashboardWorkspaceComposition
      authenticatedContext={authenticatedContext}
      clinicProfileCommands={demoClientAdapter.clinicProfileCommands}
      clinicGalleryCommands={clinicGalleryCommands}
      clinicProfileSourceCommands={clinicProfileSourceCommands}
      clinicTreatmentCommands={clinicTreatmentCommands}
      doctorProfileCommands={doctorProfileCommands}
      isSourceRefreshPending={isSourceRefreshPending}
      onSourceRefresh={refreshSources}
      persistNotificationReadStateInSession={persistNotificationReadStateInSession}
      prototypeMode={prototypeMode}
      reviewCommands={reviewSourceCommands}
      showPrototypeModeToggle={showPrototypeModeToggle}
      workspaceInput={workspaceInput}
    />
  )
}
