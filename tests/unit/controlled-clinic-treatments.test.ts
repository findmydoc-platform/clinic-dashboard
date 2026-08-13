import { afterEach, describe, expect, it } from "vitest"
import {
  createControlledClinicTreatmentProvider,
  resetControlledClinicTreatmentProviders,
} from "@/features/clinic-dashboard/clinic-profile/server/controlled-clinic-treatments"

afterEach(resetControlledClinicTreatmentProviders)

describe("controlled clinic treatment provider", () => {
  it("persists create and update state across request-scoped provider instances", async () => {
    const firstRequest = createControlledClinicTreatmentProvider("clinic-1")
    const created = await firstRequest.createTreatment({
      price: 125,
      treatmentId: "controlled-treatment-2",
    })
    expect(created).toMatchObject({ ok: true, value: { active: false, price: 125 } })
    if (!created.ok) throw new Error("Controlled treatment was not created")

    const secondRequest = createControlledClinicTreatmentProvider("clinic-1")
    await expect(secondRequest.loadTreatments()).resolves.toMatchObject({
      ok: true,
      value: { offerings: expect.arrayContaining([expect.objectContaining({ id: created.value.id })]) },
    })

    await expect(
      secondRequest.updateTreatment(created.value.id, {
        active: true,
        expectedRevision: created.value.revision,
        price: 150,
      }),
    ).resolves.toMatchObject({ ok: true, value: { active: true, price: 150 } })

    const thirdRequest = createControlledClinicTreatmentProvider("clinic-1")
    await expect(thirdRequest.loadTreatments()).resolves.toMatchObject({
      ok: true,
      value: {
        offerings: expect.arrayContaining([
          expect.objectContaining({ active: true, id: created.value.id, price: 150 }),
        ]),
      },
    })
  })

  it("isolates controlled state by server-derived clinic and rejects stale revisions", async () => {
    const clinicOne = createControlledClinicTreatmentProvider("clinic-1")
    const clinicTwo = createControlledClinicTreatmentProvider("clinic-2")
    const created = await clinicOne.createTreatment({ price: 125, treatmentId: "controlled-treatment-2" })
    if (!created.ok) throw new Error("Controlled treatment was not created")

    await expect(clinicTwo.loadTreatments()).resolves.not.toMatchObject({
      value: {
        offerings: expect.arrayContaining([expect.objectContaining({ id: created.value.id, price: 125 })]),
      },
    })
    await expect(
      clinicOne.updateTreatment(created.value.id, {
        active: true,
        expectedRevision: "2026-01-01T00:00:00.000Z",
        price: 150,
      }),
    ).resolves.toEqual({ error: "conflict", ok: false })
  })
})
