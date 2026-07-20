import type { ClinicDashboardWorkspaceInput } from "./workspace/model/workspace-input"

/**
 * Private provisional server-side boundary for workspace data.
 *
 * A future provider selector may choose a live implementation. Provider errors
 * must remain visible and must never fall back to demo data implicitly.
 */
export type ClinicDashboardWorkspaceProvider = Readonly<{
  loadWorkspace: () => Promise<ClinicDashboardWorkspaceInput>
}>
