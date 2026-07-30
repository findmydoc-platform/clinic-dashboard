import type { ClinicDashboardWorkspaceInput } from "./workspace/model/workspace-input"

/**
 * Private server-side boundary for the remaining fixture-backed workspace.
 *
 * Live business domains use their own provider contracts and the central
 * server-only composition. This aggregate contract must not grow into a
 * general live-data provider.
 */
export type ClinicDashboardWorkspaceProvider = Readonly<{
  loadWorkspace: () => Promise<ClinicDashboardWorkspaceInput>
}>
