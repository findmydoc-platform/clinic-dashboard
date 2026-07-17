import { describe, expect, it } from "vitest"
import {
  cloneClinicProfile,
  isClinicProfileDirty,
} from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile"
import {
  clinicProfileFixture,
  createClinicProfileCommandsFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/clinic-profile.fixtures"
import { validateSupportRequest } from "@/features/clinic-dashboard/support/model/support-request"
import { createSupportCommandsFixture } from "@/features/clinic-dashboard/support/testing/support.fixtures"

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

describe("support prototype contract", () => {
  it("validates required fields and screenshot metadata", () => {
    expect(
      validateSupportRequest({
        category: "",
        message: "short",
        preferredReplyChannel: "Email",
        screenshot: { name: "notes.pdf", size: 6 * 1024 * 1024, type: "application/pdf" },
        subject: "Help",
      }),
    ).toEqual({
      category: "Choose a support category.",
      message: "Describe the issue using at least 20 characters.",
      screenshot: "Choose an image file.",
      subject: "Enter a subject with at least 5 characters.",
    })
  })

  it("returns a fixture receipt without production persistence", async () => {
    const receipt = await createSupportCommandsFixture().submitSupportRequest({
      category: "Technical issue",
      message: "The review page does not refresh after I submit a response.",
      preferredReplyChannel: "Email",
      subject: "Review refresh issue",
    })
    expect(receipt).toEqual({ expectedResponse: "within one business day", ticketId: "FMD-1042" })
  })
})
