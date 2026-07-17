import {
  cloneClinicProfile,
  isClinicProfileDirty,
  type ClinicProfileDraft,
  type ClinicTeamMember,
  type ClinicTreatment,
  type MasterTreatment,
} from "./clinic-profile"
import { getClinicTreatmentRelationshipsError, getClinicTreatmentSaveError } from "./clinic-treatments"

export type ClinicProfileSaveState = "idle" | "saved" | "saving"

export type ClinicProfileUndo =
  | Readonly<{ index: number; item: ClinicTeamMember; kind: "team" }>
  | Readonly<{ index: number; item: ClinicTreatment; kind: "treatment" }>

export type ClinicProfileEditorState = Readonly<{
  draft: ClinicProfileDraft
  saved: ClinicProfileDraft
  saveState: ClinicProfileSaveState
  statusMessage: string
  treatmentCatalogue: readonly MasterTreatment[]
  undo?: ClinicProfileUndo
}>

export type ClinicProfileEditorAction =
  | Readonly<{ message?: string; profile: ClinicProfileDraft; type: "draftChanged" }>
  | Readonly<{ description: string; type: "descriptionChanged" }>
  | Readonly<{ name: string; type: "nameChanged" }>
  | Readonly<{ specialty: string; type: "specialtyAdded" }>
  | Readonly<{ specialty: string; type: "specialtyRemoved" }>
  | Readonly<{ type: "changesCancelled" }>
  | Readonly<{ type: "saveStarted" }>
  | Readonly<{ profile: ClinicProfileDraft; type: "saveSucceeded" }>
  | Readonly<{ type: "saveFailed" }>
  | Readonly<{ editingId?: string; member: ClinicTeamMember; type: "teamMemberSaved" }>
  | Readonly<{
      editingMasterTreatmentId?: string
      treatment: ClinicTreatment
      type: "treatmentSaved"
    }>
  | Readonly<{ id: string; type: "teamMemberRemoved" }>
  | Readonly<{ id: string; type: "treatmentRemoved" }>
  | Readonly<{ type: "removalUndone" }>

export function createClinicProfileEditorState(
  profile: ClinicProfileDraft,
  treatmentCatalogue: readonly MasterTreatment[],
): ClinicProfileEditorState {
  const relationshipError = getClinicTreatmentRelationshipsError(treatmentCatalogue, profile.treatments)
  if (relationshipError) throw new Error(relationshipError)

  return {
    draft: cloneClinicProfile(profile),
    saved: cloneClinicProfile(profile),
    saveState: "idle",
    statusMessage: "",
    treatmentCatalogue,
  }
}

export function selectClinicProfileDirty(state: ClinicProfileEditorState) {
  return isClinicProfileDirty(state.saved, state.draft)
}

function withDraft(
  state: ClinicProfileEditorState,
  draft: ClinicProfileDraft,
  statusMessage: string,
  undo = state.undo,
): ClinicProfileEditorState {
  if (state.saveState === "saving") return state
  const relationshipError = getClinicTreatmentRelationshipsError(state.treatmentCatalogue, draft.treatments)
  if (relationshipError) {
    return { ...state, saveState: "idle", statusMessage: relationshipError }
  }

  return {
    ...state,
    draft,
    saveState: "idle",
    statusMessage,
    undo,
  }
}

export function clinicProfileEditorReducer(
  state: ClinicProfileEditorState,
  action: ClinicProfileEditorAction,
): ClinicProfileEditorState {
  switch (action.type) {
    case "draftChanged":
      return withDraft(state, action.profile, action.message ?? "Unsaved profile changes")

    case "descriptionChanged":
      return withDraft(state, { ...state.draft, description: action.description }, "Unsaved profile changes")

    case "nameChanged":
      return withDraft(state, { ...state.draft, name: action.name }, "Unsaved profile changes")

    case "specialtyAdded":
      return withDraft(
        state,
        { ...state.draft, specialties: [...state.draft.specialties, action.specialty] },
        "Specialty staged.",
      )

    case "specialtyRemoved":
      return withDraft(
        state,
        {
          ...state.draft,
          specialties: state.draft.specialties.filter((specialty) => specialty !== action.specialty),
        },
        "Unsaved profile changes",
      )

    case "changesCancelled":
      return {
        ...state,
        draft: cloneClinicProfile(state.saved),
        saveState: "idle",
        statusMessage: "Profile changes discarded.",
        undo: undefined,
      }

    case "saveStarted":
      if (!selectClinicProfileDirty(state)) return state
      return { ...state, saveState: "saving", statusMessage: "Saving profile…" }

    case "saveSucceeded": {
      const relationshipError = getClinicTreatmentRelationshipsError(
        state.treatmentCatalogue,
        action.profile.treatments,
      )
      if (relationshipError) {
        return { ...state, saveState: "idle", statusMessage: relationshipError }
      }

      return {
        draft: cloneClinicProfile(action.profile),
        saved: cloneClinicProfile(action.profile),
        saveState: "saved",
        statusMessage: `Profile saved as revision ${action.profile.revision}.`,
        treatmentCatalogue: state.treatmentCatalogue,
        undo: undefined,
      }
    }

    case "saveFailed":
      return {
        ...state,
        saveState: "idle",
        statusMessage: "Profile changes could not be saved. Try again.",
      }

    case "teamMemberSaved":
      return withDraft(
        state,
        {
          ...state.draft,
          team: action.editingId
            ? state.draft.team.map((member) => (member.id === action.editingId ? action.member : member))
            : [...state.draft.team, action.member],
        },
        action.editingId ? "Team member changes staged." : "New team member staged.",
      )

    case "treatmentSaved": {
      const saveError = getClinicTreatmentSaveError(
        state.treatmentCatalogue,
        state.draft.treatments,
        action.treatment,
        action.editingMasterTreatmentId,
      )
      if (saveError) return { ...state, statusMessage: saveError }

      const currentTreatment = action.editingMasterTreatmentId
        ? state.draft.treatments.find(
            (treatment) => treatment.masterTreatmentId === action.editingMasterTreatmentId,
          )
        : undefined
      if (currentTreatment?.price.trim() === action.treatment.price.trim()) return state

      return withDraft(
        state,
        {
          ...state.draft,
          treatments: action.editingMasterTreatmentId
            ? state.draft.treatments.map((treatment) =>
                treatment.masterTreatmentId === action.editingMasterTreatmentId
                  ? action.treatment
                  : treatment,
              )
            : [...state.draft.treatments, action.treatment],
        },
        action.editingMasterTreatmentId ? "Clinic price changes staged." : "Treatment assignment staged.",
      )
    }

    case "teamMemberRemoved": {
      const index = state.draft.team.findIndex((member) => member.id === action.id)
      const item = state.draft.team[index]
      if (!item) return state
      return withDraft(
        state,
        { ...state.draft, team: state.draft.team.filter((member) => member.id !== action.id) },
        `${item.name} removed from the draft.`,
        { index, item, kind: "team" },
      )
    }

    case "treatmentRemoved": {
      const index = state.draft.treatments.findIndex((treatment) => treatment.masterTreatmentId === action.id)
      const item = state.draft.treatments[index]
      if (!item) return state
      const treatmentName = state.treatmentCatalogue.find(
        (treatment) => treatment.id === item.masterTreatmentId,
      )?.name
      return withDraft(
        state,
        {
          ...state.draft,
          treatments: state.draft.treatments.filter((treatment) => treatment.masterTreatmentId !== action.id),
        },
        `${treatmentName ?? "Treatment"} removed from the draft.`,
        { index, item, kind: "treatment" },
      )
    }

    case "removalUndone": {
      const undo = state.undo
      if (!undo) return state

      if (undo.kind === "team") {
        const team = [...state.draft.team]
        team.splice(Math.min(undo.index, team.length), 0, undo.item)
        return {
          ...withDraft(state, { ...state.draft, team }, `${undo.item.name} restored.`),
          undo: undefined,
        }
      }

      const treatments = [...state.draft.treatments]
      if (treatments.some((treatment) => treatment.masterTreatmentId === undo.item.masterTreatmentId)) {
        return {
          ...state,
          statusMessage: "This treatment is already assigned to the clinic.",
          undo: undefined,
        }
      }
      treatments.splice(Math.min(undo.index, treatments.length), 0, undo.item)
      const treatmentName = state.treatmentCatalogue.find(
        (treatment) => treatment.id === undo.item.masterTreatmentId,
      )?.name
      return {
        ...withDraft(state, { ...state.draft, treatments }, `${treatmentName ?? "Treatment"} restored.`),
        undo: undefined,
      }
    }
  }
}
