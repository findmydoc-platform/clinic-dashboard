import { describe, expect, it } from "vitest"
import {
  clinicDashboardLocationSelectionReducer,
  getClinicDashboardLocation,
} from "@/features/clinic-dashboard/workspace/model/locations"
import { workspaceLocationFixtures } from "@/features/clinic-dashboard/workspace/testing/workspace.fixtures"

describe("clinic dashboard location selection", () => {
  it("accepts general string ids instead of a demo-specific domain union", () => {
    expect(
      clinicDashboardLocationSelectionReducer("berlin-mitte", {
        locationId: "future-location-123",
        type: "location-selected",
      }),
    ).toBe("future-location-123")
  })

  it("resolves only ids present in the provided workspace locations", () => {
    expect(getClinicDashboardLocation(workspaceLocationFixtures, "berlin-charlottenburg")).toEqual({
      id: "berlin-charlottenburg",
      location: "Charlottenburg, Berlin",
      name: "Berlin Health Clinic — Charlottenburg",
      selectorLabel: "Charlottenburg",
    })
    expect(() => getClinicDashboardLocation(workspaceLocationFixtures, "future-location-123")).toThrow(
      "Missing clinic dashboard location: future-location-123",
    )
  })
})
