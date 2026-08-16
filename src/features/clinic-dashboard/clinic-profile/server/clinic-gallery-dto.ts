import "server-only"

import { createClinicGalleryImageProxyUrl } from "@/lib/clinic-gallery-image-proxy"
import type { ClinicGalleryMedia, ClinicGallerySnapshot } from "../model/clinic-gallery"
import { sealClinicGalleryImageSource } from "./clinic-gallery-image-token"

function proxiedMediaUrl(sourceUrl: string) {
  return createClinicGalleryImageProxyUrl(sealClinicGalleryImageSource(sourceUrl))
}

export function toDashboardClinicGalleryMedia(media: ClinicGalleryMedia): ClinicGalleryMedia {
  return {
    ...media,
    ...(media.thumbnailUrl ? { thumbnailUrl: proxiedMediaUrl(media.thumbnailUrl) } : {}),
    url: proxiedMediaUrl(media.url),
  }
}

export function toDashboardClinicGallerySnapshot(snapshot: ClinicGallerySnapshot): ClinicGallerySnapshot {
  return { ...snapshot, items: snapshot.items.map(toDashboardClinicGalleryMedia) }
}
