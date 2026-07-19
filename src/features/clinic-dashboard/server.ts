import "server-only"

import { loadClinicDashboardDemoWorkspaceInput } from "./demo/loader"
import type { ClinicDashboardWorkspaceInput } from "./workspace/model/workspace-input"

export async function loadClinicDashboardWorkspaceInput(): Promise<ClinicDashboardWorkspaceInput> {
  return loadClinicDashboardDemoWorkspaceInput()
}
