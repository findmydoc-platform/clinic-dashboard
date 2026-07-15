import { describe, expect, it } from "vitest"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import { hasProfileDestination } from "@/lib/clinic-dashboard/profile-tasks"

describe("dashboard profile task fixtures", () => {
  const tasks = clinicDashboardFixture.dashboard.profileTasks

  it("keeps stable task identifiers and truthful visibility", () => {
    expect(new Set(tasks.map(({ id }) => id)).size).toBe(tasks.length)

    const alwaysVisibleTasks = tasks.filter(({ visibility }) => visibility === "always")
    expect(alwaysVisibleTasks.map(({ id }) => id)).toEqual(["missing-images", "open-doctor-profiles"])
    expect(alwaysVisibleTasks.every(hasProfileDestination)).toBe(true)

    const fullInterfaceTasks = tasks.filter(({ visibility }) => visibility === "full-interface")
    expect(fullInterfaceTasks.map(({ id }) => id)).toEqual(["certificates-required", "certificate-expiry"])
    expect(fullInterfaceTasks.some(hasProfileDestination)).toBe(false)
  })

  it("maps profile destinations to existing read-only sections", () => {
    expect(tasks.find(({ id }) => id === "missing-images")?.destination).toBe("gallery")
    expect(tasks.find(({ id }) => id === "open-doctor-profiles")?.destination).toBe("team")
  })
})
