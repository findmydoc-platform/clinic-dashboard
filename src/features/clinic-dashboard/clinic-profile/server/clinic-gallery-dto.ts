import "server-only"

import { createClinicGalleryImageProxyUrl } from "@/lib/clinic-gallery-image-proxy"
import type { ClinicGalleryMedia, ClinicGallerySnapshot } from "../model/clinic-gallery"
import { sealClinicGalleryImageSource } from "./clinic-gallery-image-token"

function proxiedMediaUrl(sourceUrl: string, clinicId: string) {
  return createClinicGalleryImageProxyUrl(sealClinicGalleryImageSource(sourceUrl), clinicId)
}

export function toDashboardClinicGalleryMedia(
  media: ClinicGalleryMedia,
  clinicId: string,
): ClinicGalleryMedia {
  return {
    ...media,
    ...(media.thumbnailUrl ? { thumbnailUrl: proxiedMediaUrl(media.thumbnailUrl, clinicId) } : {}),
    url: proxiedMediaUrl(media.url, clinicId),
  }
}

export function toDashboardClinicGallerySnapshot(
  snapshot: ClinicGallerySnapshot,
  clinicId: string,
): ClinicGallerySnapshot {
  return { ...snapshot, items: snapshot.items.map((media) => toDashboardClinicGalleryMedia(media, clinicId)) }
}
