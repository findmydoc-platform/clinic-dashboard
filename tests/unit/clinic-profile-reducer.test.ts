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
import {
  selectAvailableMasterTreatments,
  selectClinicTreatmentViews,
} from "@/features/clinic-dashboard/clinic-profile/model/clinic-treatments"
import { selectClinicProfileEditorProjection } from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile.selectors"
import {
  clinicProfileFixture,
  clinicTreatmentCatalogueFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/clinic-profile.fixtures"

const createInitialState = () =>
  createClinicProfileEditorState(clinicProfileFixture, clinicTreatmentCatalogueFixture)

describe("clinic profile editor reducer", () => {
  it("owns semantic profile basics transitions without mutating the saved profile", () => {
    const initial = createInitialState()
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
    const initial = createInitialState()
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
      id: treatment.masterTreatmentId,
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
    const initial = createInitialState()
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
    const initial = createInitialState()
    const treatment = initial.draft.treatments[0]
    expect(treatment).toBeDefined()

    const removed = clinicProfileEditorReducer(initial, {
      id: treatment!.masterTreatmentId,
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

  it("adds and edits clinic relationships without changing the platform treatment", () => {
    const initial = createInitialState()
    const newTreatment = {
      masterTreatmentId: "master-hair-transplant",
      price: "€3,900",
    }
    const added = clinicProfileEditorReducer(initial, {
      treatment: newTreatment,
      type: "treatmentSaved",
    })
    const editedTreatment = { ...newTreatment, price: "€4,100" }
    const edited = clinicProfileEditorReducer(added, {
      editingMasterTreatmentId: newTreatment.masterTreatmentId,
      treatment: editedTreatment,
      type: "treatmentSaved",
    })

    expect(added.draft.treatments.at(-1)).toEqual(newTreatment)
    expect(added.statusMessage).toBe("Treatment assignment staged.")
    expect(edited.draft.treatments.at(-1)).toEqual(editedTreatment)
    expect(edited.draft.treatments.at(-1)?.masterTreatmentId).toBe(newTreatment.masterTreatmentId)
    expect(edited.statusMessage).toBe("Clinic price changes staged.")
    expect(selectClinicProfileDirty(edited)).toBe(true)
  })

  it("maps assigned catalogue treatments and leaves only the unassigned entry available", () => {
    expect(
      selectAvailableMasterTreatments(clinicTreatmentCatalogueFixture, clinicProfileFixture.treatments),
    ).toEqual([{ id: "master-hair-transplant", name: "Hair transplant" }])
    expect(
      selectClinicTreatmentViews(clinicTreatmentCatalogueFixture, clinicProfileFixture.treatments),
    ).toEqual([
      {
        masterTreatmentId: "master-laser-teeth-whitening",
        name: "Laser teeth whitening",
        price: "€250",
      },
      {
        masterTreatmentId: "master-ceramic-veneers",
        name: "Ceramic veneers (per tooth)",
        price: "€850",
      },
      {
        masterTreatmentId: "master-skin-analysis",
        name: "Skin analysis and treatment",
        price: "€120",
      },
    ])
  })

  it("ignores a normalized no-op price edit", () => {
    const initial = createInitialState()
    const existing = initial.draft.treatments[0]
    expect(existing).toBeDefined()
    if (!existing) return

    const unchanged = clinicProfileEditorReducer(initial, {
      editingMasterTreatmentId: existing.masterTreatmentId,
      treatment: { ...existing, price: `  ${existing.price}  ` },
      type: "treatmentSaved",
    })

    expect(unchanged).toBe(initial)
    expect(selectClinicProfileDirty(unchanged)).toBe(false)
    expect(unchanged.statusMessage).toBe("")
  })

  it("rejects unknown, duplicate, and changed master-treatment relationships", () => {
    const initial = createInitialState()
    const existing = initial.draft.treatments[0]
    expect(existing).toBeDefined()
    if (!existing) return

    const unknown = clinicProfileEditorReducer(initial, {
      treatment: { masterTreatmentId: "master-unknown", price: "€100" },
      type: "treatmentSaved",
    })
    const duplicate = clinicProfileEditorReducer(initial, {
      treatment: { ...existing, price: "€275" },
      type: "treatmentSaved",
    })
    const changedMaster = clinicProfileEditorReducer(initial, {
      editingMasterTreatmentId: existing.masterTreatmentId,
      treatment: { masterTreatmentId: "master-hair-transplant", price: "€275" },
      type: "treatmentSaved",
    })

    expect(unknown.draft).toEqual(initial.draft)
    expect(unknown.statusMessage).toContain("not in the platform catalogue")
    expect(duplicate.draft).toEqual(initial.draft)
    expect(duplicate.statusMessage).toContain("already assigned")
    expect(changedMaster.draft).toEqual(initial.draft)
    expect(changedMaster.statusMessage).toContain("cannot be changed")
  })

  it("rejects invalid initial relationship fixtures", () => {
    expect(() =>
      createClinicProfileEditorState(
        {
          ...clinicProfileFixture,
          treatments: [{ masterTreatmentId: "master-unknown", price: "€100" }],
        },
        clinicTreatmentCatalogueFixture,
      ),
    ).toThrow("not in the platform catalogue")

    expect(() =>
      createClinicProfileEditorState(
        {
          ...clinicProfileFixture,
          treatments: [
            clinicProfileFixture.treatments[0]!,
            { ...clinicProfileFixture.treatments[0]!, price: "€275" },
          ],
        },
        clinicTreatmentCatalogueFixture,
      ),
    ).toThrow("already assigned")

    expect(() =>
      createClinicProfileEditorState(
        {
          ...clinicProfileFixture,
          treatments: [{ ...clinicProfileFixture.treatments[0]!, price: "   " }],
        },
        clinicTreatmentCatalogueFixture,
      ),
    ).toThrow("Enter a clinic price")
  })

  it("tracks saving, failure, success, and cancellation as explicit transitions", () => {
    const initial = createInitialState()
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
