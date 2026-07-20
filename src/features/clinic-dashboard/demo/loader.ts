import { buildClinicDashboardDemoWorkspaceInput } from "./dataset"
import type { ClinicDashboardWorkspaceProvider } from "../workspace-provider"

export const clinicDashboardDemoWorkspaceProvider = {
  loadWorkspace: async () => buildClinicDashboardDemoWorkspaceInput(),
} satisfies ClinicDashboardWorkspaceProvider
