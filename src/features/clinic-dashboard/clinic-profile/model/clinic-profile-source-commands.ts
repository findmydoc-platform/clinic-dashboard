import type {
  ClinicProfileDraftCreateInput,
  ClinicProfileDraftDiscardInput,
  ClinicProfileDraftSaveInput,
  ClinicProfilePublishInput,
  ClinicProfileSnapshot,
} from "./clinic-profile-source"

export type ClinicProfileSourceCommandOutcome = "conflict" | "rejected" | "unknown"

export class ClinicProfileSourceCommandError extends Error {
  readonly outcome: ClinicProfileSourceCommandOutcome

  constructor(outcome: ClinicProfileSourceCommandOutcome, message: string) {
    super(message)
    this.name = "ClinicProfileSourceCommandError"
    this.outcome = outcome
  }
}

export type ClinicProfileSourceCommands = Readonly<{
  createDraft: (input: ClinicProfileDraftCreateInput) => Promise<ClinicProfileSnapshot>
  discardDraft: (input: ClinicProfileDraftDiscardInput) => Promise<ClinicProfileSnapshot>
  loadSnapshot: () => Promise<ClinicProfileSnapshot>
  publishDraft: (input: ClinicProfilePublishInput) => Promise<ClinicProfileSnapshot>
  saveDraft: (input: ClinicProfileDraftSaveInput) => Promise<ClinicProfileSnapshot>
}>
