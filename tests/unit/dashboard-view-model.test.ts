import { describe, expect, it } from "vitest"
import { createDashboardViewModel } from "@/features/clinic-dashboard/dashboard/dashboard-view-model.mapper"
import { createDashboardProfileCompletionMetric } from "@/features/clinic-dashboard/dashboard/model/profile-progress"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"

const profileProgress = {
  areas: [
    { complete: true, id: "basic-information", missingItems: [] },
    { complete: true, id: "address", missingItems: [] },
    { complete: true, id: "languages", missingItems: [] },
    { complete: true, id: "opening-hours", missingItems: [] },
    { complete: false, id: "clinic-images", missingItems: ["2 supporting images"] },
    { complete: false, id: "treatments", missingItems: ["1 active treatment"] },
  ],
  completedAreaCount: 4,
  percent: 67,
  status: "ready",
  tasks: [],
  totalAreaCount: 6,
} as const

describe("dashboard view model", () => {
  it("derives the top public-profile metric from the same progress state", () => {
    expect(createDashboardProfileCompletionMetric(profileProgress)).toEqual({
      id: "completion",
      label: "Public profile completion",
      progress: 67,
      value: "67%",
    })
    expect(createDashboardProfileCompletionMetric({ status: "loading" })).toEqual({
      id: "completion",
      label: "Public profile completion",
      note: "Loading public profile",
      value: "—",
    })
    expect(
      createDashboardProfileCompletionMetric({
        message: "Public profile progress is temporarily unavailable.",
        reason: "gallery-unavailable",
        status: "error",
      }),
    ).toEqual({
      id: "completion",
      label: "Public profile completion",
      note: "Unavailable",
      value: "—",
    })
  })

  it("maps the selected reporting period and location-specific clinic details", () => {
    const model = createDashboardViewModel(
      dashboardFixture,
      "7 days",
      {
        coverAlt: "Mitte exterior",
        coverImage: "/mitte.jpg",
        location: "Mitte, Berlin",
        name: "Berlin Health Clinic — Mitte",
      },
      profileProgress,
    )

    expect(model.reporting.period).toBe("7 days")
    expect(model.profileProgress).toBe(profileProgress)
    expect(model.clinicPreview).toEqual({
      coverAlt: "Mitte exterior",
      coverImage: "/mitte.jpg",
      location: "Mitte, Berlin",
      name: "Berlin Health Clinic — Mitte",
      ratingLabel: "4.8 ★",
    })
  })

  it("keeps profile progress independent from the reporting period and location snapshot", () => {
    const alternateSnapshot = {
      ...dashboardFixture,
      rating: { ...dashboardFixture.rating, count: 486, value: 4.6 },
    }
    const model = createDashboardViewModel(
      alternateSnapshot,
      "30 days",
      {
        coverAlt: "Charlottenburg exterior",
        coverImage: "/charlottenburg.jpg",
        location: "Charlottenburg, Berlin",
        name: "Berlin Health Clinic — Charlottenburg",
      },
      profileProgress,
    )

    expect(model.profileProgress).toBe(profileProgress)
    expect(model.rating).toMatchObject({ count: 486, value: 4.6 })
    expect(model.clinicPreview).toEqual({
      coverAlt: "Charlottenburg exterior",
      coverImage: "/charlottenburg.jpg",
      location: "Charlottenburg, Berlin",
      name: "Berlin Health Clinic — Charlottenburg",
      ratingLabel: "4.6 ★",
    })
  })
})
