import { describe, expect, it } from "vitest"
import { createDashboardViewModel } from "@/features/clinic-dashboard/dashboard/dashboard-view-model.mapper"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"

describe("dashboard view model", () => {
  it("maps the selected reporting period and location-specific clinic details", () => {
    const model = createDashboardViewModel(dashboardFixture, "7 days", {
      coverAlt: "Mitte exterior",
      coverImage: "/mitte.jpg",
      location: "Mitte, Berlin",
      name: "Berlin Health Clinic — Mitte",
    })

    expect(model.reporting.period).toBe("7 days")
    expect(model.profileTasks).toBe(dashboardFixture.profileTasks)
    expect(model.profileCompletion).toBe("82%")
    expect(model.clinicPreview).toEqual({
      coverAlt: "Mitte exterior",
      coverImage: "/mitte.jpg",
      location: "Mitte, Berlin",
      name: "Berlin Health Clinic — Mitte",
      ratingLabel: "4.8 ★",
    })
  })

  it("maps completion, reputation, and cover from another location snapshot", () => {
    const alternateSnapshot = {
      ...dashboardFixture,
      profileCompletion: 91,
      rating: { ...dashboardFixture.rating, count: 486, value: 4.6 },
    }
    const model = createDashboardViewModel(alternateSnapshot, "30 days", {
      coverAlt: "Charlottenburg exterior",
      coverImage: "/charlottenburg.jpg",
      location: "Charlottenburg, Berlin",
      name: "Berlin Health Clinic — Charlottenburg",
    })

    expect(model.profileCompletion).toBe("91%")
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
