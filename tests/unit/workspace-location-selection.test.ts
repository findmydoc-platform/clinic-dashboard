import { describe, expect, it } from "vitest"
import {
  clinicDashboardLocationIds,
  clinicDashboardLocationSelectionReducer,
  defaultClinicDashboardLocationId,
  getClinicDashboardPrototypeLocation,
  isClinicDashboardLocationId,
} from "@/features/clinic-dashboard/workspace/model/locations"
import { workspaceLocationFixtures } from "@/features/clinic-dashboard/workspace/testing/workspace.fixtures"

describe("clinic dashboard prototype location selection", () => {
  it("keeps a closed set of location ids with Berlin Mitte as the default", () => {
    expect(clinicDashboardLocationIds).toEqual(["berlin-mitte", "berlin-charlottenburg", "potsdam"])
    expect(defaultClinicDashboardLocationId).toBe("berlin-mitte")
    expect(isClinicDashboardLocationId("berlin-charlottenburg")).toBe(true)
    expect(isClinicDashboardLocationId("potsdam")).toBe(true)
    expect(isClinicDashboardLocationId("clinic-123")).toBe(false)
  })

  it("selects the alternate location through a pure reducer", () => {
    expect(
      clinicDashboardLocationSelectionReducer("berlin-mitte", {
        locationId: "berlin-charlottenburg",
        type: "location-selected",
      }),
    ).toBe("berlin-charlottenburg")
  })

  it("resolves the invented location identities without a tenant identifier", () => {
    expect(getClinicDashboardPrototypeLocation(workspaceLocationFixtures, "berlin-mitte")).toEqual({
      id: "berlin-mitte",
      location: "Mitte, Berlin",
      name: "Berlin Health Clinic — Mitte",
      selectorLabel: "Mitte",
    })
    expect(getClinicDashboardPrototypeLocation(workspaceLocationFixtures, "berlin-charlottenburg")).toEqual({
      id: "berlin-charlottenburg",
      location: "Charlottenburg, Berlin",
      name: "Berlin Health Clinic — Charlottenburg",
      selectorLabel: "Charlottenburg",
    })
    expect(getClinicDashboardPrototypeLocation(workspaceLocationFixtures, "potsdam")).toEqual({
      id: "potsdam",
      location: "Potsdam, Brandenburg",
      name: "Berlin Health Clinic — Potsdam",
      selectorLabel: "Potsdam",
    })
  })
})
