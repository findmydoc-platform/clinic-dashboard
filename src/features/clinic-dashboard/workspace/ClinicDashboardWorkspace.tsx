"use client"

import { clinicProfileDemoCommands, reviewDemoCommands } from "@/features/clinic-dashboard/demo/commands"
import type { ClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/public"
import { ClinicDashboardWorkspaceComposition } from "./ClinicDashboardWorkspaceComposition"
import type { ClinicDashboardWorkspaceInput } from "./model/workspace-input"

export type ClinicDashboardWorkspaceProps = Readonly<{
  persistWorkspaceStateInSession?: boolean
  prototypeMode: ClinicDashboardPrototypeMode
  showPrototypeModeToggle?: boolean
  workspaceInput: ClinicDashboardWorkspaceInput
}>

export function ClinicDashboardWorkspace({
  persistWorkspaceStateInSession = false,
  prototypeMode,
  showPrototypeModeToggle = false,
  workspaceInput,
}: ClinicDashboardWorkspaceProps) {
  return (
    <ClinicDashboardWorkspaceComposition
      clinicProfileCommands={clinicProfileDemoCommands}
      persistWorkspaceStateInSession={persistWorkspaceStateInSession}
      prototypeMode={prototypeMode}
      reviewCommands={reviewDemoCommands}
      showPrototypeModeToggle={showPrototypeModeToggle}
      workspaceInput={workspaceInput}
    />
  )
}
