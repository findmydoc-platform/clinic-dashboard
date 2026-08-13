import type { ClinicProfileCommands } from "@/features/clinic-dashboard/clinic-profile/public"
import type { MessageCommands } from "@/features/clinic-dashboard/messages/public"
import type { ClinicDashboardWorkspaceInput } from "../workspace/model/workspace-input"
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
  messageCommands: MessageCommands
  projectDashboardAfterProfileSave: typeof projectDemoDashboardAfterProfileSave
}>

export function createClinicDashboardDemoClientAdapter(
  workspaceInput: ClinicDashboardWorkspaceInput,
): ClinicDashboardDemoClientAdapter {
  return {
    clinicProfileCommands: clinicProfileDemoCommands,
    messageCommands: {
      sendMessage: async ({ attachment, body, conversationId }) =>
        resolveDemoValue({
          attachment,
          body: body.trim(),
          id: `local-message-${conversationId}-${globalThis.crypto.randomUUID()}`,
          read: "Read 11:08",
          sender: "doctor" as const,
          time: "11:08",
        }),
    },
    projectDashboardAfterProfileSave: projectDemoDashboardAfterProfileSave,
  }
}
