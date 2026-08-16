import { afterEach, describe, expect, it } from "vitest"
import {
  createControlledClinicGalleryProvider,
  resetControlledClinicGallery,
} from "@/features/clinic-dashboard/clinic-profile/server/controlled-clinic-gallery"

afterEach(resetControlledClinicGallery)

describe("controlled clinic gallery provider", () => {
  it("persists upload and save across request-scoped providers", async () => {
    const upload = await createControlledClinicGalleryProvider("clinic-1").uploadMedia({
      file: new File(["image"], "clinic.jpg", { type: "image/jpeg" }),
    })
    if (!upload.ok) throw new Error("Upload failed")
    const saved = await createControlledClinicGalleryProvider("clinic-1").saveGallery({
      expectedRevision: 0,
      items: [{ alt: "Clinic reception", mediaId: upload.value.id }],
    })
    expect(saved).toMatchObject({ ok: true, value: { revision: 1 } })
    await expect(createControlledClinicGalleryProvider("clinic-1").loadGallery()).resolves.toMatchObject({
      ok: true,
      value: { items: [{ alt: "Clinic reception", status: "published" }], revision: 1 },
    })
  })

  it("isolates clinics and rejects stale revisions", async () => {
    const clinicOne = createControlledClinicGalleryProvider("clinic-1")
    const clinicTwo = createControlledClinicGalleryProvider("clinic-2")
    const upload = await clinicOne.uploadMedia({
      file: new File(["image"], "clinic.jpg", { type: "image/jpeg" }),
    })
    if (!upload.ok) throw new Error("Upload failed")
    await expect(clinicTwo.loadGallery()).resolves.toMatchObject({ value: { items: [] } })
    await expect(
      clinicOne.saveGallery({
        expectedRevision: 99,
        items: [{ alt: "Clinic reception", mediaId: upload.value.id }],
      }),
    ).resolves.toEqual({ error: "conflict", ok: false })
  })
})
