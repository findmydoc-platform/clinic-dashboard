import { describe, expect, it } from "vitest"
import { createDashboardPrototypeViewModel } from "@/features/clinic-dashboard/dashboard/dashboard.prototype-data.mapper"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"

describe("prototype dashboard view model", () => {
  it("maps the selected reporting period without changing the prototype source", () => {
    const model = createDashboardPrototypeViewModel(dashboardFixture, "7 days")

    expect(model.reporting.period).toBe("7 days")
    expect(model.profileTasks).toBe(dashboardFixture.profileTasks)
    expect(model.profileCompletion).toBe("82%")
  })
})
