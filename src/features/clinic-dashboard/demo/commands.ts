import type { ClinicProfileCommands } from "@/features/clinic-dashboard/clinic-profile/public"
import { projectDemoDashboardAfterProfileSave } from "./profile-projection"

const demoTimestamp = "2026-07-19T10:00:00.000Z"
const demoLatencyMs = 300

const resolveDemoValue = async <Value>(value: Value) => {
  await new Promise((done) => setTimeout(done, demoLatencyMs))
  return value
}

const clinicProfileDemoCommands: ClinicProfileCommands = {
  createClinicProfileEntityId: (kind) => `${kind}-${globalThis.crypto.randomUUID()}`,
  saveClinicProfile: async (profile) =>
    resolveDemoValue({
      ...profile,
      revision: profile.revision + 1,
      updatedAt: demoTimestamp,
    }),
}

export type ClinicDashboardDemoClientAdapter = Readonly<{
  clinicProfileCommands: ClinicProfileCommands
  projectDashboardAfterProfileSave: typeof projectDemoDashboardAfterProfileSave
}>

export function createClinicDashboardDemoClientAdapter(): ClinicDashboardDemoClientAdapter {
  return {
    clinicProfileCommands: clinicProfileDemoCommands,
    projectDashboardAfterProfileSave: projectDemoDashboardAfterProfileSave,
  }
}
