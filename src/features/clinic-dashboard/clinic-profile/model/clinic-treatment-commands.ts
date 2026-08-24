import type {
  ClinicTreatmentCreateInput,
  ClinicTreatmentOffering,
  ClinicTreatmentsSnapshot,
  ClinicTreatmentUpdateInput,
} from "./clinic-treatment"

export type ClinicTreatmentCommandErrorCode =
  "conflict" | "forbidden" | "invalid-input" | "rejected" | "unknown"

export class ClinicTreatmentCommandError extends Error {
  readonly code: ClinicTreatmentCommandErrorCode

  constructor(code: ClinicTreatmentCommandErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = "ClinicTreatmentCommandError"
  }
}

export type ClinicTreatmentCommands = Readonly<{
  createTreatment: (input: ClinicTreatmentCreateInput) => Promise<ClinicTreatmentOffering>
  loadTreatments: () => Promise<ClinicTreatmentsSnapshot>
  updateTreatment: (offeringId: string, input: ClinicTreatmentUpdateInput) => Promise<ClinicTreatmentOffering>
}>
