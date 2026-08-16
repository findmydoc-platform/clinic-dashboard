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

  it("persists main-image reorder and removal across request-scoped providers", async () => {
    const firstProvider = createControlledClinicGalleryProvider("clinic-1")
    const firstUpload = await firstProvider.uploadMedia({
      file: new File(["first"], "first.jpg", { type: "image/jpeg" }),
    })
    const secondUpload = await firstProvider.uploadMedia({
      file: new File(["second"], "second.jpg", { type: "image/jpeg" }),
    })
    if (!firstUpload.ok || !secondUpload.ok) throw new Error("Upload failed")

    const initialSave = await firstProvider.saveGallery({
      expectedRevision: 0,
      items: [
        { alt: "First image", mediaId: firstUpload.value.id },
        { alt: "Second image", mediaId: secondUpload.value.id },
      ],
    })
    if (!initialSave.ok) throw new Error("Initial save failed")

    const nextProvider = createControlledClinicGalleryProvider("clinic-1")
    await expect(
      nextProvider.saveGallery({
        expectedRevision: initialSave.value.revision,
        items: [{ alt: "Second image", mediaId: secondUpload.value.id }],
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: { items: [{ alt: "Second image", id: secondUpload.value.id }], revision: 2 },
    })

    await expect(createControlledClinicGalleryProvider("clinic-1").loadGallery()).resolves.toMatchObject({
      ok: true,
      value: { items: [{ alt: "Second image", id: secondUpload.value.id }], revision: 2 },
    })
  })

  it("rejects duplicate media IDs instead of persisting an ambiguous order", async () => {
    const provider = createControlledClinicGalleryProvider("clinic-1")
    const upload = await provider.uploadMedia({
      file: new File(["image"], "clinic.jpg", { type: "image/jpeg" }),
    })
    if (!upload.ok) throw new Error("Upload failed")

    await expect(
      provider.saveGallery({
        expectedRevision: 0,
        items: [
          { alt: "Clinic reception", mediaId: upload.value.id },
          { alt: "Clinic reception duplicate", mediaId: upload.value.id },
        ],
      }),
    ).resolves.toEqual({ error: "invalid-input", ok: false })
  })

  it("retains concurrent uploads with unique media IDs", async () => {
    const uploads = await Promise.all([
      createControlledClinicGalleryProvider("clinic-1").uploadMedia({
        file: new File(["first"], "first.jpg", { type: "image/jpeg" }),
      }),
      createControlledClinicGalleryProvider("clinic-1").uploadMedia({
        file: new File(["second"], "second.jpg", { type: "image/jpeg" }),
      }),
    ])

    expect(uploads.every((upload) => upload.ok)).toBe(true)
    const snapshot = await createControlledClinicGalleryProvider("clinic-1").loadGallery()
    if (!snapshot.ok) throw new Error("Gallery load failed")
    expect(snapshot.value.items).toHaveLength(2)
    expect(new Set(snapshot.value.items.map((item) => item.id))).toHaveProperty("size", 2)
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
