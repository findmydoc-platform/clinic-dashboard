import { describe, expect, it } from "vitest"
import {
  clinicProfileEditorReducer,
  createClinicProfileEditorState,
  selectClinicProfileDirty,
} from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile.reducer"
import {
  isClinicProfileDialogAvailable,
  isClinicProfileDialogAvailabilityEqual,
  selectAvailableClinicProfileDialog,
} from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile-dialogs"
import { selectClinicProfileEditorProjection } from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile.selectors"
import { clinicProfileFixture } from "@/features/clinic-dashboard/clinic-profile/testing/clinic-profile.fixtures"

const createInitialState = () => createClinicProfileEditorState(clinicProfileFixture)

describe("clinic profile editor reducer", () => {
  it("owns profile transitions without treatment state", () => {
    const initial = createInitialState()
    const specialty = initial.draft.specialties[0]!
    const renamed = clinicProfileEditorReducer(initial, {
      name: "Berlin Health International",
      type: "nameChanged",
    })
    const described = clinicProfileEditorReducer(renamed, {
      description: "Updated clinic profile description.",
      type: "descriptionChanged",
    })
    const removed = clinicProfileEditorReducer(described, {
      specialty,
      type: "specialtyRemoved",
    })

    expect(removed.draft.name).toBe("Berlin Health International")
    expect(removed.draft.description).toBe("Updated clinic profile description.")
    expect(removed.draft.specialties).not.toContain(specialty)
    expect(removed.saved).toEqual(initial.saved)
    expect(selectClinicProfileDirty(removed)).toBe(true)
    expect(removed.draft).not.toHaveProperty("treatments")
  })

  it("makes dialog availability an explicit profile capability decision", () => {
    const presentationAvailability = {
      profileManagement: "hidden",
      teamManagement: "hidden",
    } as const
    const readOnlyAvailability = {
      profileManagement: "read-only",
      teamManagement: "read-only",
    } as const

    expect(isClinicProfileDialogAvailable("address", presentationAvailability)).toBe(false)
    expect(isClinicProfileDialogAvailable("gallery", presentationAvailability)).toBe(true)
    expect(isClinicProfileDialogAvailabilityEqual(presentationAvailability, readOnlyAvailability)).toBe(false)
    expect(selectAvailableClinicProfileDialog("address", presentationAvailability)).toBeUndefined()
    expect(selectAvailableClinicProfileDialog("team-member", readOnlyAvailability)).toBeUndefined()
    expect(selectAvailableClinicProfileDialog("team-member", readOnlyAvailability, true)).toBe("team-member")
  })

  it("projects independently gated profile and team drafts", () => {
    const initial = createInitialState()
    const renamed = clinicProfileEditorReducer(initial, {
      name: "Allowed profile draft",
      type: "nameChanged",
    })
    const member = renamed.draft.team[0]!
    const teamRemoved = clinicProfileEditorReducer(renamed, {
      id: member.id,
      type: "teamMemberRemoved",
    })

    const profileOnlyProjection = selectClinicProfileEditorProjection(teamRemoved, {
      profileManagement: "interactive",
      teamManagement: "read-only",
    })
    const teamOnlyProjection = selectClinicProfileEditorProjection(teamRemoved, {
      profileManagement: "read-only",
      teamManagement: "interactive",
    })

    expect(profileOnlyProjection.profile.name).toBe("Allowed profile draft")
    expect(profileOnlyProjection.profile.team).toEqual(initial.saved.team)
    expect(teamOnlyProjection.profile.name).toBe(initial.saved.name)
    expect(teamOnlyProjection.profile.team).toEqual(teamRemoved.draft.team)
    expect(teamOnlyProjection.undoKind).toBe("team")
  })

  it("adds, edits, removes, and restores team members", () => {
    const initial = createInitialState()
    const newMember = {
      biography: "Coordinates international patient journeys.",
      id: "team-story-coordinator",
      initials: "AK",
      name: "Anna Keller",
      specialty: "Patient coordinator",
    }
    const added = clinicProfileEditorReducer(initial, {
      member: newMember,
      type: "teamMemberSaved",
    })
    const editedMember = { ...newMember, name: "Anna Keller-Smith" }
    const edited = clinicProfileEditorReducer(added, {
      editingId: newMember.id,
      member: editedMember,
      type: "teamMemberSaved",
    })
    const removed = clinicProfileEditorReducer(edited, {
      id: newMember.id,
      type: "teamMemberRemoved",
    })
    const restored = clinicProfileEditorReducer(removed, { type: "removalUndone" })

    expect(added.draft.team.at(-1)).toEqual(newMember)
    expect(edited.draft.team.at(-1)).toEqual(editedMember)
    expect(removed.draft.team).not.toContainEqual(editedMember)
    expect(restored.draft.team.at(-1)).toEqual(editedMember)
  })

  it("tracks saving, failure, success, and cancellation", () => {
    const initial = createInitialState()
    const changed = clinicProfileEditorReducer(initial, {
      profile: {
        ...initial.draft,
        address: { ...initial.draft.address, street: "Updated address" },
      },
      type: "draftChanged",
    })
    const saving = clinicProfileEditorReducer(changed, { type: "saveStarted" })
    const failed = clinicProfileEditorReducer(saving, { type: "saveFailed" })
    const saved = clinicProfileEditorReducer(failed, {
      profile: { ...failed.draft, revision: failed.draft.revision + 1 },
      type: "saveSucceeded",
    })
    const changedAgain = clinicProfileEditorReducer(saved, {
      profile: {
        ...saved.draft,
        address: { ...saved.draft.address, street: "Another address" },
      },
      type: "draftChanged",
    })
    const cancelled = clinicProfileEditorReducer(changedAgain, { type: "changesCancelled" })

    expect(saving.saveState).toBe("saving")
    expect(failed.statusMessage).toContain("could not be saved")
    expect(selectClinicProfileDirty(saved)).toBe(false)
    expect(cancelled.draft).toEqual(cancelled.saved)
  })
})
