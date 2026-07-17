import { describe, expect, it } from "vitest"
import { createDashboardPrototypeViewModel } from "@/features/clinic-dashboard/dashboard/dashboard.prototype-data.mapper"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"

describe("prototype dashboard view model", () => {
  it("maps the selected reporting period without changing the prototype source", () => {
    const model = createDashboardPrototypeViewModel(dashboardFixture, "7 days", {
      location: "Mitte, Berlin",
      name: "Berlin Health Clinic — Mitte",
    })

    expect(model.reporting.period).toBe("7 days")
    expect(model.profileTasks).toBe(dashboardFixture.profileTasks)
    expect(model.profileCompletion).toBe("82%")
    expect(model.clinicPreview).toEqual({
      location: "Mitte, Berlin",
      name: "Berlin Health Clinic — Mitte",
      ratingLabel: "4.8 ★",
    })
  })

  it("changes only the dashboard location summary for another prototype location", () => {
    const defaultModel = createDashboardPrototypeViewModel(dashboardFixture, "30 days", {
      location: "Mitte, Berlin",
      name: "Berlin Health Clinic — Mitte",
    })
    const alternateModel = createDashboardPrototypeViewModel(dashboardFixture, "30 days", {
      location: "Charlottenburg, Berlin",
      name: "Berlin Health Clinic — Charlottenburg",
    })

    expect(alternateModel).toEqual({
      ...defaultModel,
      clinicPreview: {
        ...defaultModel.clinicPreview,
        location: "Charlottenburg, Berlin",
        name: "Berlin Health Clinic — Charlottenburg",
      },
    })
  })
})
