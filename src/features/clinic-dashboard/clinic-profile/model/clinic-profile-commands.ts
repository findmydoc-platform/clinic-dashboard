import type { ClinicProfileDraft } from "./clinic-profile"

export type ClinicProfileEntityKind = "team" | "treatment"

export type ClinicProfileCommands = Readonly<{
  createClinicProfileEntityId: (kind: ClinicProfileEntityKind) => string
  saveClinicProfile: (profile: ClinicProfileDraft) => Promise<ClinicProfileDraft>
}>
