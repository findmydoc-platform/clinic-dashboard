import { describe, expect, it } from "vitest"
import { accountMenuActions, createStaffProfile } from "@/features/clinic-dashboard/workspace/model/account"

describe("workspace account profile", () => {
  it("keeps account profile, theme, and sign-out as separate visible actions", () => {
    expect(Object.entries(accountMenuActions)).toEqual([
      ["profile", { label: "Account profile", visibility: "always" }],
      ["theme", { label: "Dark mode", visibility: "always" }],
      ["signOut", { label: "Sign out", visibility: "always" }],
    ])
  })

  it("projects only the read-only staff identity fields", () => {
    const source = {
      email: "not-exposed@example.test",
      initials: "SS",
      name: "Sarah Schmidt",
      password: "not-exposed",
      phone: "+49 000 000000",
      role: "Clinic administrator",
    }

    expect(createStaffProfile(source)).toEqual({
      email: "not-exposed@example.test",
      initials: "SS",
      name: "Sarah Schmidt",
      role: "Clinic administrator",
    })
  })
})
