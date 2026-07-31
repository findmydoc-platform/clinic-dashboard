import { describe, expect, it } from "vitest"
import {
  areClinicProfileDraftInputsEqual,
  classifyClinicProfileDraftCreateReconciliation,
  classifyClinicProfileDraftSaveReconciliation,
  classifyClinicProfilePublishReconciliation,
  createClinicProfileChangeSet,
  createEmptyClinicProfileOpeningHours,
  formatClinicProfileOpeningHoursDay,
  validateClinicProfileForPublish,
} from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile-editing"
import { createClinicProfileDraftInput } from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile-source"
import {
  clinicProfileSourceDraftFixture,
  clinicProfileSourceFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/clinic-profile-source.fixtures"

describe("clinic profile editing", () => {
  it("ignores language order while keeping partial field changes detectable", () => {
    const input = createClinicProfileDraftInput(clinicProfileSourceFixture.published)
    expect(
      areClinicProfileDraftInputsEqual(input, {
        ...input,
        supportedLanguages: [...input.supportedLanguages].reverse(),
      }),
    ).toBe(true)
    expect(
      areClinicProfileDraftInputsEqual(input, {
        ...input,
        address: { ...input.address, houseNumber: "199" },
      }),
    ).toBe(false)
  })

  it("counts every changed address component and weekday as one field", () => {
    const changeSet = createClinicProfileChangeSet(clinicProfileSourceDraftFixture)

    expect(changeSet.fieldCount).toBe(4)
    expect(changeSet.sectionCount).toBe(3)
    expect(changeSet.changes.map((change) => change.field)).toEqual([
      "descriptionText",
      "supportedLanguages",
      "address.houseNumber",
      "openingHours.saturday",
    ])
  })

  it("keeps not configured distinct from a fully closed week", () => {
    expect(formatClinicProfileOpeningHoursDay(undefined)).toBe("Not configured")
    expect(formatClinicProfileOpeningHoursDay(createEmptyClinicProfileOpeningHours().monday)).toBe("Closed")
  })

  it("allows incomplete drafts but maps known publish errors to exact fields", () => {
    const input = createClinicProfileDraftInput(clinicProfileSourceFixture.published)
    const errors = validateClinicProfileForPublish({
      ...input,
      address: { ...input.address, cityId: undefined, zipCode: "" },
      openingHours: {
        ...input.openingHours!,
        monday: { closesAt: "", isClosed: false, opensAt: "09:00" },
      },
      supportedLanguages: [],
    })

    expect(errors).toEqual({
      "address.cityId": "Select a city.",
      "address.zipCode": "Enter the postal code.",
      "openingHours.monday": "Enter a complete opening and closing time.",
      supportedLanguages: "Select at least one language.",
    })
  })

  it("requires a description before publishing", () => {
    const input = createClinicProfileDraftInput(clinicProfileSourceFixture.published)
    expect(validateClinicProfileForPublish({ ...input, descriptionText: "   " })).toMatchObject({
      descriptionText: "Enter the clinic description.",
    })
  })

  it("accepts an unknown publish as successful only when the published fields match the attempt", () => {
    const attemptedDraft = createClinicProfileDraftInput(clinicProfileSourceDraftFixture.draft!)
    const {
      basePublishedRevision: _basePublishedRevision,
      revision: _draftRevision,
      ...publishedFields
    } = clinicProfileSourceDraftFixture.draft!
    const publishedAttempt = {
      ...clinicProfileSourceDraftFixture,
      draft: undefined,
      published: { ...publishedFields, revision: 5 },
    }

    expect(classifyClinicProfilePublishReconciliation(publishedAttempt, attemptedDraft, 2, 4)).toBe(
      "published",
    )
    expect(
      classifyClinicProfilePublishReconciliation(
        {
          ...publishedAttempt,
          published: { ...publishedAttempt.published, name: "Another clinic" },
        },
        attemptedDraft,
        2,
        4,
      ),
    ).toBe("conflict")
    expect(
      classifyClinicProfilePublishReconciliation(clinicProfileSourceDraftFixture, attemptedDraft, 2, 4),
    ).toBe("not-published")
  })

  it("reconciles draft creation and save outcomes only at the expected revisions", () => {
    const publishedBaseline = createClinicProfileDraftInput(clinicProfileSourceFixture.published)
    const createdSnapshot = {
      ...clinicProfileSourceFixture,
      draft: {
        ...clinicProfileSourceFixture.published,
        basePublishedRevision: 4,
        revision: 1,
      },
    }
    const attemptedDraft = { ...publishedBaseline, name: "Updated clinic" }
    const savedSnapshot = {
      ...createdSnapshot,
      draft: { ...createdSnapshot.draft, name: attemptedDraft.name, revision: 2 },
    }

    expect(classifyClinicProfileDraftCreateReconciliation(createdSnapshot, publishedBaseline, 4)).toBe(
      "created",
    )
    expect(
      classifyClinicProfileDraftCreateReconciliation(clinicProfileSourceFixture, publishedBaseline, 4),
    ).toBe("not-created")
    expect(
      classifyClinicProfileDraftSaveReconciliation(savedSnapshot, attemptedDraft, publishedBaseline, 1, 4),
    ).toBe("saved")
    expect(
      classifyClinicProfileDraftSaveReconciliation(createdSnapshot, attemptedDraft, publishedBaseline, 1, 4),
    ).toBe("not-saved")
    expect(
      classifyClinicProfileDraftSaveReconciliation(
        { ...savedSnapshot, draft: { ...savedSnapshot.draft, revision: 3 } },
        attemptedDraft,
        publishedBaseline,
        1,
        4,
      ),
    ).toBe("conflict")
  })
})
