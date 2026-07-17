import { describe, expect, it } from "vitest"
import {
  cloneClinicProfile,
  isClinicProfileDirty,
} from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile"
import {
  clinicProfileFixture,
  createClinicProfileCommandsFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/clinic-profile.fixtures"

describe("clinic profile prototype contract", () => {
  it("clones nested profile data and detects draft changes", () => {
    const saved = cloneClinicProfile(clinicProfileFixture)
    const draft = cloneClinicProfile(saved)
    expect(isClinicProfileDirty(saved, draft)).toBe(false)
    expect(draft.address).not.toBe(saved.address)

    const changedDraft = { ...draft, address: { ...draft.address, city: "Hamburg" } }
    expect(isClinicProfileDirty(saved, changedDraft)).toBe(true)
    expect(saved.address.city).toBe("Berlin")
  })

  it("increments the revision when the fixture profile is saved", async () => {
    const dataSource = createClinicProfileCommandsFixture()
    const profile = cloneClinicProfile(clinicProfileFixture)
    const saved = await dataSource.saveClinicProfile({ ...profile, name: "Updated prototype clinic" })

    expect(saved.name).toBe("Updated prototype clinic")
    expect(saved.revision).toBe(profile.revision + 1)
  })

  it("provides deterministic entity IDs isolated to each command fixture", () => {
    const firstCommands = createClinicProfileCommandsFixture()
    const secondCommands = createClinicProfileCommandsFixture()

    expect(firstCommands.createClinicProfileEntityId("team")).toBe("team-fixture-1")
    expect(firstCommands.createClinicProfileEntityId("team")).toBe("team-fixture-2")
    expect(firstCommands.createClinicProfileEntityId("treatment")).toBe("treatment-fixture-1")
    expect(secondCommands.createClinicProfileEntityId("team")).toBe("team-fixture-1")
  })
})
