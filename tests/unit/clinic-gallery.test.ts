import { describe, expect, it } from "vitest"
import {
  clinicGalleryHasChanges,
  clinicGallerySaveInput,
  clinicGalleryUploadConstraintError,
  moveClinicGalleryItem,
  restoreClinicGalleryItem,
  type ClinicGallerySnapshot,
} from "@/features/clinic-dashboard/clinic-profile/model/clinic-gallery"
import {
  createClinicGalleryImageProxyUrl,
  isClinicGalleryImageProxyUrl,
} from "@/lib/clinic-gallery-image-proxy"

const snapshot = {
  constraints: {
    acceptedMimeTypes: ["image/jpeg"],
    maxConcurrentUploads: 3,
    maxFileBytes: 4_194_304,
    maxItems: 12,
    maxPixels: 50_000_000,
  },
  items: [
    { alt: "Reception", id: "one", status: "published", url: "https://example.com/one.jpg" },
    { alt: "Consultation", id: "two", status: "published", url: "https://example.com/two.jpg" },
  ],
  revision: 4,
} as const satisfies ClinicGallerySnapshot

describe("clinic gallery model", () => {
  it("identifies only the authenticated gallery image proxy shape", () => {
    const proxyUrl = createClinicGalleryImageProxyUrl("opaque-token")

    expect(proxyUrl).toBe("/api/dashboard/gallery/image?token=opaque-token")
    expect(proxyUrl).not.toContain("preview.findmydoc.eu")
    expect(isClinicGalleryImageProxyUrl(proxyUrl)).toBe(true)
    expect(isClinicGalleryImageProxyUrl("/api/dashboard/doctors/doctor-1/image")).toBe(false)
    expect(isClinicGalleryImageProxyUrl({ src: proxyUrl })).toBe(false)
  })

  it("returns a concrete error for images above the pixel limit", () => {
    expect(
      clinicGalleryUploadConstraintError(snapshot.constraints, {
        mimeType: "image/jpeg",
        pixels: 50_000_001,
        size: 1_024,
      }),
    ).toBe("Image exceeds the 50 megapixel limit.")
  })

  it("uses order as the main-image contract", () => {
    const reordered = moveClinicGalleryItem(snapshot.items, "two", 0)
    expect(reordered.map((item) => item.id)).toEqual(["two", "one"])
    expect(clinicGalleryHasChanges(snapshot, reordered)).toBe(true)
  })

  it("restores multiple removals in their stable relative order", () => {
    const [one, two] = snapshot.items
    if (!one || !two) throw new Error("Gallery fixture requires two items.")
    const three = { ...two, id: "three" }
    const withoutBoth = [three]

    const withFirst = restoreClinicGalleryItem(withoutBoth, {
      index: 0,
      item: one,
      nextId: two.id,
    })
    const restored = restoreClinicGalleryItem(withFirst, {
      index: 0,
      item: two,
      nextId: three.id,
    })

    expect(restored.map((item) => item.id)).toEqual(["one", "two", "three"])
  })

  it("builds the focused save DTO and trims public metadata", () => {
    expect(
      clinicGallerySaveInput(snapshot, [
        { ...snapshot.items[1], alt: "  Calm consultation room  ", captionText: "  Patient area  " },
      ]),
    ).toEqual({
      expectedRevision: 4,
      items: [{ alt: "Calm consultation room", captionText: "Patient area", mediaId: "two" }],
    })
  })
})
