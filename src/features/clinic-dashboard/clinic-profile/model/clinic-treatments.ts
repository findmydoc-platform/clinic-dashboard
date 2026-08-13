import type { ClinicTreatmentCreateInput, ClinicTreatmentOffering, MasterTreatment } from "./clinic-treatment"

export function getClinicTreatmentInputError(
  catalogue: readonly MasterTreatment[],
  offerings: readonly ClinicTreatmentOffering[],
  input: ClinicTreatmentCreateInput,
) {
  if (!catalogue.some((treatment) => treatment.id === input.treatmentId)) {
    return "The selected treatment is not in the platform catalogue."
  }
  if (!isValidClinicTreatmentPrice(input.price)) {
    return "Enter a non-negative EUR price with at most two decimal places."
  }
  if (offerings.some((offering) => offering.treatment.id === input.treatmentId)) {
    return "This treatment is already assigned to the clinic."
  }

  return undefined
}

export function selectAvailableMasterTreatments(
  catalogue: readonly MasterTreatment[],
  offerings: readonly ClinicTreatmentOffering[],
) {
  const assignedIds = new Set(offerings.map((offering) => offering.treatment.id))
  return catalogue.filter((treatment) => !assignedIds.has(treatment.id))
}

export function isValidClinicTreatmentPrice(value: number) {
  if (!Number.isFinite(value) || value < 0) return false
  return Math.abs(value * 100 - Math.round(value * 100)) <= 1e-8
}
