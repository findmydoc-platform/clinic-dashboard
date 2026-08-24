const clinicGalleryErrorCodes = [
  "conflict",
  "forbidden",
  "invalid-input",
  "media-not-found",
  "unauthorized",
  "unavailable",
  "unsupported-media-type",
  "upload-too-large",
] as const

export type ClinicGalleryErrorCode = (typeof clinicGalleryErrorCodes)[number]

export type ClinicGalleryMedia = Readonly<{
  alt: string
  captionText?: string
  height?: number
  id: string
  status: "draft" | "published"
  thumbnailUrl?: string
  url: string
  width?: number
}>

export type ClinicGalleryConstraints = Readonly<{
  acceptedMimeTypes: readonly string[]
  maxConcurrentUploads: 3
  maxFileBytes: number
  maxItems: number
  maxPixels: number
}>

export type ClinicGallerySnapshot = Readonly<{
  constraints: ClinicGalleryConstraints
  items: readonly ClinicGalleryMedia[]
  revision: number
}>

export type ClinicGalleryLoadStatus = "forbidden" | "ready" | "temporarily-unavailable"

export type ClinicGallerySaveInput = Readonly<{
  expectedRevision: number
  items: readonly Readonly<{
    alt: string
    captionText?: string
    mediaId: string
  }>[]
}>

export type ClinicGalleryUploadInput = Readonly<{
  alt?: string
  captionText?: string
  file: File
}>

export function clinicGalleryUploadConstraintError(
  constraints: ClinicGalleryConstraints,
  file: Readonly<{ mimeType: string; pixels?: number; size: number }>,
) {
  if (!constraints.acceptedMimeTypes.includes(file.mimeType)) return "Unsupported image format."
  if (file.size > constraints.maxFileBytes) {
    return `Image exceeds the ${Math.round(constraints.maxFileBytes / (1024 * 1024))} MB limit.`
  }
  if (file.pixels !== undefined && file.pixels > constraints.maxPixels) {
    return `Image exceeds the ${Math.round(constraints.maxPixels / 1_000_000)} megapixel limit.`
  }
  return undefined
}

export function moveClinicGalleryItem(
  items: readonly ClinicGalleryMedia[],
  itemId: string,
  targetIndex: number,
) {
  const currentIndex = items.findIndex((item) => item.id === itemId)
  if (currentIndex < 0) return items
  const boundedIndex = Math.max(0, Math.min(targetIndex, items.length - 1))
  if (boundedIndex === currentIndex) return items

  const next = [...items]
  const [item] = next.splice(currentIndex, 1)
  if (!item) return items
  next.splice(boundedIndex, 0, item)
  return next
}

export function restoreClinicGalleryItem(
  items: readonly ClinicGalleryMedia[],
  removed: Readonly<{
    index: number
    item: ClinicGalleryMedia
    nextId?: string
    previousId?: string
  }>,
) {
  if (items.some((item) => item.id === removed.item.id)) return items

  const nextIndex = removed.nextId ? items.findIndex((item) => item.id === removed.nextId) : -1
  const previousIndex = removed.previousId ? items.findIndex((item) => item.id === removed.previousId) : -1
  const targetIndex =
    nextIndex >= 0
      ? nextIndex
      : previousIndex >= 0
        ? previousIndex + 1
        : Math.min(removed.index, items.length)
  const restored = [...items]
  restored.splice(targetIndex, 0, removed.item)
  return restored
}

export function clinicGalleryHasChanges(
  snapshot: ClinicGallerySnapshot,
  items: readonly ClinicGalleryMedia[],
) {
  if (snapshot.items.length !== items.length) return true
  return snapshot.items.some((saved, index) => {
    const current = items[index]
    return (
      !current ||
      saved.id !== current.id ||
      saved.alt !== current.alt ||
      (saved.captionText ?? "") !== (current.captionText ?? "")
    )
  })
}

export function clinicGallerySaveInput(
  snapshot: ClinicGallerySnapshot,
  items: readonly ClinicGalleryMedia[],
): ClinicGallerySaveInput {
  return {
    expectedRevision: snapshot.revision,
    items: items.map((item) => ({
      alt: item.alt.trim(),
      ...(item.captionText?.trim() ? { captionText: item.captionText.trim() } : {}),
      mediaId: item.id,
    })),
  }
}
