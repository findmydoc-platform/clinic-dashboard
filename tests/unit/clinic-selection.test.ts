import { describe, expect, it } from "vitest"
import { resolveClinicSelection } from "@/features/clinic-dashboard/workspace/model/clinic-selection"

const clinics = [
  { id: "clinic-a", name: "Alpha", capabilities: [] },
  { id: "clinic-b", name: "Beta", capabilities: [] },
] as const

describe("fresh personal clinic selection", () => {
  it("restores a preference only for the current person and fresh authorized set", () => {
    expect(
      resolveClinicSelection(
        clinics,
        "staff-1",
        undefined,
        JSON.stringify({ principalId: "staff-1", clinicId: "clinic-b" }),
      ),
    ).toEqual({ clinic: clinics[1], reason: "restored" })
    expect(
      resolveClinicSelection(
        clinics,
        "staff-2",
        undefined,
        JSON.stringify({ principalId: "staff-1", clinicId: "clinic-b" }),
      ),
    ).toEqual({ clinic: clinics[0], reason: "first" })
    expect(
      resolveClinicSelection(
        clinics,
        "staff-1",
        undefined,
        JSON.stringify({ principalId: "staff-1", clinicId: "clinic-foreign" }),
      ),
    ).toEqual({ clinic: clinics[0], reason: "fallback" })
  })
  it("denies an explicit foreign target and restricts an empty authorized set", () => {
    expect(resolveClinicSelection(clinics, "staff-1", "clinic-foreign")).toEqual({ reason: "denied" })
    expect(resolveClinicSelection([], "staff-1")).toEqual({ reason: "empty" })
  })
})
