import "server-only"

import { randomUUID } from "node:crypto"
import type { ClinicGalleryMedia, ClinicGallerySnapshot } from "../model/clinic-gallery"
import type { ClinicGalleryProvider } from "./clinic-gallery-provider"

const constraints = {
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  maxConcurrentUploads: 3,
  maxFileBytes: 4 * 1024 * 1024,
  maxItems: 12,
  maxPixels: 50_000_000,
} as const

type ControlledClinicGalleryState = {
  galleryByClinic: Map<string, ClinicGallerySnapshot>
  mediaSequence: number
}

function controlledState() {
  const controlledGlobal = globalThis as typeof globalThis & {
    __findmydocControlledClinicGallery?: ControlledClinicGalleryState
  }
  controlledGlobal.__findmydocControlledClinicGallery ??= {
    galleryByClinic: new Map<string, ClinicGallerySnapshot>(),
    mediaSequence: 0,
  }
  return controlledGlobal.__findmydocControlledClinicGallery
}

function snapshotFor(clinicId: string) {
  const state = controlledState()
  const existing = state.galleryByClinic.get(clinicId)
  if (existing) return existing
  const empty = { constraints, items: [], revision: 0 } as const
  state.galleryByClinic.set(clinicId, empty)
  return empty
}

export function resetControlledClinicGallery() {
  const state = controlledState()
  state.galleryByClinic.clear()
  state.mediaSequence = 0
}

export function createControlledClinicGalleryProvider(clinicId: string): ClinicGalleryProvider {
  return {
    async discardDrafts(mediaIds) {
      const current = snapshotFor(clinicId)
      controlledState().galleryByClinic.set(clinicId, {
        ...current,
        items: current.items.filter((item) => item.status === "published" || !mediaIds.includes(item.id)),
      })
      return { ok: true, value: undefined }
    },
    async loadGallery() {
      return { ok: true, value: snapshotFor(clinicId) }
    },
    async loadImage(sourceUrl) {
      const source = new URL(sourceUrl)
      if (
        source.hostname !== "images.unsplash.com" ||
        source.pathname !== "/photo-1576091160399-112ba8d25d1d"
      ) {
        return { error: "forbidden", ok: false }
      }
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xw1Q2QAAAABJRU5ErkJggg==", // pragma: allowlist secret
        "base64",
      )
      return {
        ok: true,
        value: { body: new Uint8Array(png).buffer as ArrayBuffer, contentType: "image/png" },
      }
    },
    async saveGallery(input) {
      const current = snapshotFor(clinicId)
      if (current.revision !== input.expectedRevision) return { error: "conflict", ok: false }
      if (new Set(input.items.map((item) => item.mediaId)).size !== input.items.length) {
        return { error: "invalid-input", ok: false }
      }
      const byId = new Map(current.items.map((item) => [item.id, item]))
      const items: ClinicGalleryMedia[] = []
      for (const inputItem of input.items) {
        const media = byId.get(inputItem.mediaId)
        if (!media) return { error: "media-not-found", ok: false }
        items.push({
          ...media,
          alt: inputItem.alt,
          captionText: inputItem.captionText,
          status: "published",
        })
      }
      const next = { constraints, items, revision: current.revision + 1 }
      controlledState().galleryByClinic.set(clinicId, next)
      return { ok: true, value: next }
    },
    async uploadMedia(input) {
      const current = snapshotFor(clinicId)
      if (input.file.size > constraints.maxFileBytes) return { error: "upload-too-large", ok: false }
      if (!constraints.acceptedMimeTypes.some((mimeType) => mimeType === input.file.type)) {
        return { error: "unsupported-media-type", ok: false }
      }
      if (current.items.length >= constraints.maxItems) return { error: "invalid-input", ok: false }
      const state = controlledState()
      state.mediaSequence += 1
      const media: ClinicGalleryMedia = {
        alt: input.alt ?? "",
        captionText: input.captionText,
        id: `controlled-gallery-${randomUUID()}`,
        status: "draft",
        url: `https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80&v=${state.mediaSequence}`,
      }
      state.galleryByClinic.set(clinicId, { ...current, items: [...current.items, media] })
      return { ok: true, value: media }
    },
  }
}
