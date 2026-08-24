import { describe, expect, it } from "vitest"
import {
  dashboardProfileProgressConflict,
  dashboardProfileProgressDraft,
  dashboardProfileProgressPublishReady,
  dashboardProfileTasks,
} from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"

describe("dashboard profile task fixtures", () => {
  it("keeps the six category tasks ordered, executable, and free of artificial priority", () => {
    expect(dashboardProfileTasks.map(({ id }) => id)).toEqual([
      "basic-information",
      "address",
      "languages",
      "opening-hours",
      "clinic-images",
      "treatments",
    ])
    expect(new Set(dashboardProfileTasks.map(({ id }) => id)).size).toBe(6)
    expect(dashboardProfileTasks.every((task) => task.destination && task.destinationLabel)).toBe(true)
    expect(JSON.stringify(dashboardProfileTasks)).not.toMatch(/priority|certificate|qualified inquiries/i)
  })

  it("exposes one action for each active profile-draft state", () => {
    expect(dashboardProfileProgressDraft.tasks[0]).toMatchObject({
      destination: "address",
      id: "complete-profile-draft",
      kind: "complete-draft",
    })
    expect(dashboardProfileProgressPublishReady.tasks[0]).toMatchObject({
      destination: "review-publish",
      id: "publish-profile-changes",
      kind: "publish-draft",
    })
    expect(dashboardProfileProgressConflict.tasks[0]).toMatchObject({
      destination: "conflict",
      id: "review-profile-changes",
      kind: "review-draft",
    })
  })
})
