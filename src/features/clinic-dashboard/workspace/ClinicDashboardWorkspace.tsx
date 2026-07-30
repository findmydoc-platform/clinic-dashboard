"use client"

import { useMemo } from "react"
import { createClinicDashboardDemoClientAdapter } from "@/features/clinic-dashboard/demo/commands"
import type { AuthenticatedClinicContext } from "@/features/clinic-dashboard/auth/public"
import {
  createClinicProfileSourceApiCommands,
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
  const demoClientAdapter = useMemo(
    () => createClinicDashboardDemoClientAdapter(workspaceInput),
    [workspaceInput],
  )
  const doctorProfileCommands = useMemo(() => createDoctorProfileApiCommands(), [])
  const clinicProfileSourceCommands = useMemo(() => createClinicProfileSourceApiCommands(), [])
  const reviewSourceCommands = useMemo(() => createReviewSourceApiCommands(), [])
  const clinicTreatmentCommands = useMemo(() => createClinicTreatmentApiCommands(), [])

  return (
    <ClinicDashboardWorkspaceComposition
      authenticatedContext={authenticatedContext}
      clinicProfileCommands={demoClientAdapter.clinicProfileCommands}
      clinicProfileSourceCommands={clinicProfileSourceCommands}
      clinicTreatmentCommands={clinicTreatmentCommands}
      doctorProfileCommands={doctorProfileCommands}
      projectDashboardAfterProfileSave={demoClientAdapter.projectDashboardAfterProfileSave}
      persistNotificationReadStateInSession={persistNotificationReadStateInSession}
      prototypeMode={prototypeMode}
      reviewCommands={reviewSourceCommands}
      showPrototypeModeToggle={showPrototypeModeToggle}
      workspaceInput={workspaceInput}
    />
  )
}
