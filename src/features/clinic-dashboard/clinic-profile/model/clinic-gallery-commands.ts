import type {
  ClinicGalleryErrorCode,
  ClinicGalleryMedia,
  ClinicGallerySaveInput,
  ClinicGallerySnapshot,
  ClinicGalleryUploadInput,
} from "./clinic-gallery"

export class ClinicGalleryCommandError extends Error {
  constructor(
    readonly code: ClinicGalleryErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "ClinicGalleryCommandError"
  }
}

export type ClinicGalleryCommands = Readonly<{
  discardDrafts: (mediaIds: readonly string[]) => Promise<void>
  loadGallery: () => Promise<ClinicGallerySnapshot>
  saveGallery: (input: ClinicGallerySaveInput) => Promise<ClinicGallerySnapshot>
  uploadMedia: (input: ClinicGalleryUploadInput) => Promise<ClinicGalleryMedia>
}>
