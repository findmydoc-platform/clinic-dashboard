import "server-only"

import type {
  ClinicGalleryErrorCode,
  ClinicGalleryMedia,
  ClinicGallerySaveInput,
  ClinicGallerySnapshot,
  ClinicGalleryUploadInput,
} from "../model/clinic-gallery"

export type ClinicGalleryProviderResult<TValue> =
  Readonly<{ ok: true; value: TValue }> | Readonly<{ error: ClinicGalleryErrorCode; ok: false }>

export type ClinicGalleryProvider = Readonly<{
  discardDrafts: (mediaIds: readonly string[]) => Promise<ClinicGalleryProviderResult<undefined>>
  loadGallery: () => Promise<ClinicGalleryProviderResult<ClinicGallerySnapshot>>
  loadImage: (
    sourceUrl: string,
  ) => Promise<ClinicGalleryProviderResult<Readonly<{ body: ArrayBuffer; contentType: string }>>>
  saveGallery: (input: ClinicGallerySaveInput) => Promise<ClinicGalleryProviderResult<ClinicGallerySnapshot>>
  uploadMedia: (input: ClinicGalleryUploadInput) => Promise<ClinicGalleryProviderResult<ClinicGalleryMedia>>
}>

export type ClinicGalleryProviderFactory = (accessToken: string, clinicId: string) => ClinicGalleryProvider
