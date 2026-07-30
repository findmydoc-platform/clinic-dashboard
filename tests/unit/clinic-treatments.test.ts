import { describe, expect, it } from "vitest"
import {
  getClinicTreatmentInputError,
  isValidClinicTreatmentPrice,
  selectAvailableMasterTreatments,
} from "@/features/clinic-dashboard/clinic-profile/model/clinic-treatments"
import { clinicTreatmentSnapshotFixture } from "@/features/clinic-dashboard/clinic-profile/testing/clinic-profile.fixtures"

describe("clinic treatment model", () => {
  it.each([0, 12, 12.3, 12.34])("accepts %s EUR", (price) => {
    expect(isValidClinicTreatmentPrice(price)).toBe(true)
  })

  it.each([-0.01, 12.345, Number.NaN])("rejects %s EUR", (price) => {
    expect(isValidClinicTreatmentPrice(price)).toBe(false)
  })

  it("only offers unassigned central treatments", () => {
    expect(
      selectAvailableMasterTreatments(
        clinicTreatmentSnapshotFixture.catalogue,
        clinicTreatmentSnapshotFixture.offerings,
      ).map(({ id }) => id),
    ).toEqual(["master-hair-transplant"])
  })

  it("rejects duplicate treatment assignments", () => {
    expect(
      getClinicTreatmentInputError(
        clinicTreatmentSnapshotFixture.catalogue,
        clinicTreatmentSnapshotFixture.offerings,
        {
          active: false,
          price: 250,
          treatmentId: "master-laser-teeth-whitening",
        },
      ),
    ).toContain("already assigned")
  })
})
