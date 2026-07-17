import type {
  ClinicTreatment,
  ClinicTreatmentInput,
  ClinicTreatmentView,
  MasterTreatment,
} from "./clinic-profile"

export function getClinicTreatmentRelationshipsError(
  catalogue: readonly MasterTreatment[],
  relationships: readonly ClinicTreatment[],
) {
  const knownIds = new Set(catalogue.map((treatment) => treatment.id))
  const assignedIds = new Set<string>()

  for (const relationship of relationships) {
    if (!knownIds.has(relationship.masterTreatmentId)) {
      return "The selected treatment is not in the platform catalogue."
    }
    if (assignedIds.has(relationship.masterTreatmentId)) {
      return "This treatment is already assigned to the clinic."
    }
    if (!relationship.price.trim()) {
      return "Enter a clinic price."
    }
    assignedIds.add(relationship.masterTreatmentId)
  }

  return undefined
}

export function getClinicTreatmentSaveError(
  catalogue: readonly MasterTreatment[],
  relationships: readonly ClinicTreatment[],
  input: ClinicTreatmentInput,
  editingMasterTreatmentId?: string,
) {
  if (!catalogue.some((treatment) => treatment.id === input.masterTreatmentId)) {
    return "The selected treatment is not in the platform catalogue."
  }
  if (!input.price.trim()) return "Enter a clinic price."
  if (
    editingMasterTreatmentId &&
    !relationships.some((relationship) => relationship.masterTreatmentId === editingMasterTreatmentId)
  ) {
    return "This treatment is no longer assigned to the clinic."
  }
  if (editingMasterTreatmentId && input.masterTreatmentId !== editingMasterTreatmentId) {
    return "The platform treatment cannot be changed while editing a clinic price."
  }
  if (
    relationships.some(
      (relationship) =>
        relationship.masterTreatmentId === input.masterTreatmentId &&
        relationship.masterTreatmentId !== editingMasterTreatmentId,
    )
  ) {
    return "This treatment is already assigned to the clinic."
  }

  return undefined
}

export function selectAvailableMasterTreatments(
  catalogue: readonly MasterTreatment[],
  relationships: readonly ClinicTreatment[],
) {
  const assignedIds = new Set(relationships.map((relationship) => relationship.masterTreatmentId))
  return catalogue.filter((treatment) => !assignedIds.has(treatment.id))
}

export function selectClinicTreatmentViews(
  catalogue: readonly MasterTreatment[],
  relationships: readonly ClinicTreatment[],
): readonly ClinicTreatmentView[] {
  const catalogueById = new Map(catalogue.map((treatment) => [treatment.id, treatment]))

  return relationships.map((relationship) => {
    const masterTreatment = catalogueById.get(relationship.masterTreatmentId)
    if (!masterTreatment) {
      throw new Error(`Unknown platform treatment: ${relationship.masterTreatmentId}`)
    }

    return { ...relationship, name: masterTreatment.name }
  })
}
