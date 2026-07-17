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

describe("clinic profile editor reducer", () => {
  it("owns semantic profile basics transitions without mutating the saved profile", () => {
    const initial = createClinicProfileEditorState(clinicProfileFixture)
    const specialty = initial.draft.specialties[0]
    expect(specialty).toBeDefined()

    const renamed = clinicProfileEditorReducer(initial, {
      name: "Berlin Health International",
      type: "nameChanged",
    })
    const described = clinicProfileEditorReducer(renamed, {
      description: "Updated clinic profile description.",
      type: "descriptionChanged",
    })
    const removed = clinicProfileEditorReducer(described, {
      specialty: specialty!,
      type: "specialtyRemoved",
    })
    const added = clinicProfileEditorReducer(removed, {
      specialty: "Cardiology",
      type: "specialtyAdded",
    })

    expect(added.draft.name).toBe("Berlin Health International")
    expect(added.draft.description).toBe("Updated clinic profile description.")
    expect(added.draft.specialties).not.toContain(specialty)
    expect(added.draft.specialties).toContain("Cardiology")
    expect(added.saved).toEqual(initial.saved)
    expect(selectClinicProfileDirty(added)).toBe(true)
    expect(added.statusMessage).toBe("Specialty staged.")
  })

  it("makes dialog availability an explicit capability decision", () => {
    const presentationAvailability = {
      profileManagement: "hidden",
      teamManagement: "hidden",
    } as const
    const readOnlyPreviewAvailability = {
      profileManagement: "read-only",
      teamManagement: "read-only",
    } as const

    expect(isClinicProfileDialogAvailable("address", presentationAvailability)).toBe(false)
    expect(isClinicProfileDialogAvailable("gallery", presentationAvailability)).toBe(true)
    expect(isClinicProfileDialogAvailable("gallery", readOnlyPreviewAvailability)).toBe(true)
    expect(
      isClinicProfileDialogAvailabilityEqual(presentationAvailability, readOnlyPreviewAvailability),
    ).toBe(false)
    expect(selectAvailableClinicProfileDialog("address", presentationAvailability)).toBeUndefined()
    expect(selectAvailableClinicProfileDialog("team-member", readOnlyPreviewAvailability)).toBeUndefined()
    expect(selectAvailableClinicProfileDialog("treatment", readOnlyPreviewAvailability)).toBeUndefined()
    expect(selectAvailableClinicProfileDialog("team-member", readOnlyPreviewAvailability, true)).toBe(
      "team-member",
    )
    expect(selectAvailableClinicProfileDialog("treatment", readOnlyPreviewAvailability, true)).toBe(
      "treatment",
    )
  })

  it("projects only saved profile and team state after management is withdrawn", () => {
    const initial = createClinicProfileEditorState(clinicProfileFixture)
    const changedName = clinicProfileEditorReducer(initial, {
      name: "Hidden draft clinic",
      type: "nameChanged",
    })
    const treatment = changedName.draft.treatments[0]
    const member = changedName.draft.team[0]
    expect(treatment).toBeDefined()
    expect(member).toBeDefined()
    if (!treatment || !member) return

    const withoutTreatment = clinicProfileEditorReducer(changedName, {
      id: treatment.id,
      type: "treatmentRemoved",
    })
    const withoutMember = clinicProfileEditorReducer(withoutTreatment, {
      id: member.id,
      type: "teamMemberRemoved",
    })
    const projection = selectClinicProfileEditorProjection(withoutMember, {
      profileManagement: "read-only",
      teamManagement: "read-only",
    })

    expect(projection).toEqual({
      isDirty: false,
      profile: withoutMember.saved,
      saveState: "idle",
      statusMessage: "",
      undoKind: undefined,
      undoMessage: undefined,
    })
  })

  it("projects independently gated profile and team drafts", () => {
    const initial = createClinicProfileEditorState(clinicProfileFixture)
    const renamed = clinicProfileEditorReducer(initial, {
      name: "Allowed profile draft",
      type: "nameChanged",
    })
    const member = renamed.draft.team[0]
    expect(member).toBeDefined()
    if (!member) return

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
    expect(profileOnlyProjection.undoKind).toBeUndefined()
    expect(teamOnlyProjection.profile.name).toBe(initial.saved.name)
    expect(teamOnlyProjection.profile.team).toEqual(teamRemoved.draft.team)
    expect(teamOnlyProjection.undoKind).toBe("team")
  })

  it("stages, removes, and restores a treatment without mutating the saved profile", () => {
    const initial = createClinicProfileEditorState(clinicProfileFixture)
    const treatment = initial.draft.treatments[0]
    expect(treatment).toBeDefined()

    const removed = clinicProfileEditorReducer(initial, {
      id: treatment!.id,
      type: "treatmentRemoved",
    })

    expect(removed.draft.treatments).toHaveLength(initial.draft.treatments.length - 1)
    expect(removed.saved.treatments).toHaveLength(initial.saved.treatments.length)
    expect(removed.undo?.kind).toBe("treatment")
    expect(selectClinicProfileDirty(removed)).toBe(true)

    const restored = clinicProfileEditorReducer(removed, { type: "removalUndone" })
    expect(restored.draft.treatments).toEqual(initial.draft.treatments)
    expect(restored.undo).toBeUndefined()
  })

  it("does not move a treatment beyond the available range", () => {
    const initial = createClinicProfileEditorState(clinicProfileFixture)
    const first = initial.draft.treatments[0]
    expect(first).toBeDefined()

    expect(
      clinicProfileEditorReducer(initial, {
        direction: -1,
        id: first!.id,
        type: "treatmentMoved",
      }),
    ).toBe(initial)
  })

  it("adds, edits, removes, and restores team members", () => {
    const initial = createClinicProfileEditorState(clinicProfileFixture)
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
    expect(added.statusMessage).toBe("New team member staged.")
    expect(edited.draft.team.at(-1)).toEqual(editedMember)
    expect(edited.draft.team.at(-1)?.id).toBe(newMember.id)
    expect(edited.statusMessage).toBe("Team member changes staged.")
    expect(removed.draft.team).not.toContainEqual(editedMember)
    expect(removed.undo).toMatchObject({ item: editedMember, kind: "team" })
    expect(restored.draft.team.at(-1)).toEqual(editedMember)
    expect(restored.undo).toBeUndefined()
    expect(restored.statusMessage).toBe("Anna Keller-Smith restored.")
  })

  it("adds, edits, and reorders treatments", () => {
    const initial = createClinicProfileEditorState(clinicProfileFixture)
    const newTreatment = {
      category: "Dentistry",
      description: "A focused follow-up treatment.",
      duration: "30 min",
      id: "treatment-story-follow-up",
      name: "Dental follow-up",
      price: "€90",
    }
    const added = clinicProfileEditorReducer(initial, {
      treatment: newTreatment,
      type: "treatmentSaved",
    })
    const editedTreatment = { ...newTreatment, price: "€95" }
    const edited = clinicProfileEditorReducer(added, {
      editingId: newTreatment.id,
      treatment: editedTreatment,
      type: "treatmentSaved",
    })
    const moved = clinicProfileEditorReducer(edited, {
      direction: -1,
      id: newTreatment.id,
      type: "treatmentMoved",
    })

    expect(added.draft.treatments.at(-1)).toEqual(newTreatment)
    expect(added.statusMessage).toBe("New treatment staged.")
    expect(edited.draft.treatments.at(-1)).toEqual(editedTreatment)
    expect(edited.draft.treatments.at(-1)?.id).toBe(newTreatment.id)
    expect(edited.statusMessage).toBe("Treatment changes staged.")
    expect(moved.draft.treatments.at(-2)).toEqual(editedTreatment)
    expect(moved.statusMessage).toBe("Treatment order staged.")
    expect(selectClinicProfileDirty(moved)).toBe(true)
  })

  it("tracks saving, failure, success, and cancellation as explicit transitions", () => {
    const initial = createClinicProfileEditorState(clinicProfileFixture)
    const changed = clinicProfileEditorReducer(initial, {
      message: "Address changes staged.",
      profile: {
        ...initial.draft,
        address: { ...initial.draft.address, street: "Updated address" },
      },
      type: "draftChanged",
    })
    const saving = clinicProfileEditorReducer(changed, { type: "saveStarted" })
    expect(saving.saveState).toBe("saving")

    const failed = clinicProfileEditorReducer(saving, { type: "saveFailed" })
    expect(failed.saveState).toBe("idle")
    expect(failed.statusMessage).toContain("could not be saved")

    const savedProfile = { ...failed.draft, revision: failed.draft.revision + 1 }
    const saved = clinicProfileEditorReducer(failed, {
      profile: savedProfile,
      type: "saveSucceeded",
    })
    expect(saved.saveState).toBe("saved")
    expect(selectClinicProfileDirty(saved)).toBe(false)

    const changedAgain = clinicProfileEditorReducer(saved, {
      profile: {
        ...saved.draft,
        address: { ...saved.draft.address, street: "Another address" },
      },
      type: "draftChanged",
    })
    const cancelled = clinicProfileEditorReducer(changedAgain, { type: "changesCancelled" })
    expect(cancelled.draft).toEqual(cancelled.saved)
    expect(cancelled.statusMessage).toContain("discarded")
  })
})
