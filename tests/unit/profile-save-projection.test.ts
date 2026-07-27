import { describe, expect, it } from "vitest"
import { clinicProfileFixture } from "@/features/clinic-dashboard/clinic-profile/testing/clinic-profile.fixtures"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"
import { projectDashboardProfileSave } from "@/features/clinic-dashboard/workspace/model/profile-save-projection"

const rule = { galleryIncrement: 4, maximum: 90 }

describe("dashboard profile-save projection", () => {
  it("does not change completion for an unrelated saved profile field", () => {
    const projected = projectDashboardProfileSave({
      initialProfile: clinicProfileFixture,
      rule,
      savedProfile: { ...clinicProfileFixture, name: "Updated clinic name" },
      snapshot: dashboardFixture,
    })

    expect(projected.profileCompletion).toBe(82)
    expect(projected.profileTasks).toEqual(dashboardFixture.profileTasks)
  })

  it("resolves the gallery task only after its saved value changes", () => {
    const nextCover = clinicProfileFixture.gallery[1]
    if (!nextCover) throw new Error("A second gallery fixture is required.")
    const savedProfile = {
      ...clinicProfileFixture,
      gallery: clinicProfileFixture.gallery.map((image) => ({
        ...image,
        isCover: image.id === nextCover.id,
      })),
    }
    const projected = projectDashboardProfileSave({
      initialProfile: clinicProfileFixture,
      rule,
      savedProfile,
      snapshot: dashboardFixture,
    })

    expect(projected.profileCompletion).toBe(86)
    expect(projected.profileTasks.some(({ destination }) => destination === "gallery")).toBe(false)
    expect(projected.profileTasks.some(({ destination }) => destination === "doctors")).toBe(true)
    expect(projected.profileTasks.filter(({ destination }) => !destination)).toEqual(
      dashboardFixture.profileTasks.filter(({ destination }) => !destination),
    )
  })

  it("caps completion without removing certificate tasks", () => {
    const nextCover = clinicProfileFixture.gallery[1]
    if (!nextCover) throw new Error("A second gallery fixture is required.")
    const projected = projectDashboardProfileSave({
      initialProfile: clinicProfileFixture,
      rule: { ...rule, maximum: 84 },
      savedProfile: {
        ...clinicProfileFixture,
        gallery: clinicProfileFixture.gallery.map((image) => ({
          ...image,
          isCover: image.id === nextCover.id,
        })),
      },
      snapshot: dashboardFixture,
    })

    expect(projected.profileCompletion).toBe(84)
    expect(projected.profileTasks.filter(({ destination }) => !destination)).toHaveLength(2)
  })
})
