import "server-only"

import { clinicDashboardDemoWorkspaceProvider } from "./demo/loader"
import type { ClinicDashboardWorkspaceInput } from "./workspace/model/workspace-input"

export { getClinicDashboardAccess } from "./auth/server/public"

export async function loadClinicDashboardWorkspaceInput(): Promise<ClinicDashboardWorkspaceInput> {
  return clinicDashboardDemoWorkspaceProvider.loadWorkspace()
}
