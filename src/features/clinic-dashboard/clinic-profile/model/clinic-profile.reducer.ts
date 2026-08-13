import {
  cloneClinicProfile,
  isClinicProfileDirty,
  type ClinicProfileDraft,
  type ClinicTeamMember,
} from "./clinic-profile"

export type ClinicProfileSaveState = "idle" | "saved" | "saving"

export type ClinicProfileUndo = Readonly<{ index: number; item: ClinicTeamMember; kind: "team" }>

export type ClinicProfileEditorState = Readonly<{
  draft: ClinicProfileDraft
  saved: ClinicProfileDraft
  saveState: ClinicProfileSaveState
  statusMessage: string
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
  | Readonly<{ id: string; type: "teamMemberRemoved" }>
  | Readonly<{ type: "removalUndone" }>

export function createClinicProfileEditorState(profile: ClinicProfileDraft): ClinicProfileEditorState {
  return {
    draft: cloneClinicProfile(profile),
    saved: cloneClinicProfile(profile),
    saveState: "idle",
    statusMessage: "",
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
      return {
        draft: cloneClinicProfile(action.profile),
        saved: cloneClinicProfile(action.profile),
        saveState: "saved",
        statusMessage: `Profile saved as revision ${action.profile.revision}.`,
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

    case "removalUndone": {
      const undo = state.undo
      if (!undo) return state

      const team = [...state.draft.team]
      team.splice(Math.min(undo.index, team.length), 0, undo.item)
      return {
        ...withDraft(state, { ...state.draft, team }, `${undo.item.name} restored.`),
        undo: undefined,
      }
    }
  }
}
