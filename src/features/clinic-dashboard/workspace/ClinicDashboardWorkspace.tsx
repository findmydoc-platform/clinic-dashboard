"use client"

import { useMemo } from "react"
import { createClinicDashboardDemoClientAdapter } from "@/features/clinic-dashboard/demo/commands"
import type { AuthenticatedClinicContext } from "@/features/clinic-dashboard/auth/public"
import type { ClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/public"
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

  return (
    <ClinicDashboardWorkspaceComposition
      authenticatedContext={authenticatedContext}
      clinicProfileCommands={demoClientAdapter.clinicProfileCommands}
      projectDashboardAfterProfileSave={demoClientAdapter.projectDashboardAfterProfileSave}
      persistNotificationReadStateInSession={persistNotificationReadStateInSession}
      prototypeMode={prototypeMode}
      reviewCommands={demoClientAdapter.reviewCommands}
      showPrototypeModeToggle={showPrototypeModeToggle}
      workspaceInput={workspaceInput}
    />
  )
}
