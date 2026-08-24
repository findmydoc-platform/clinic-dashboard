const CLINIC_GALLERY_IMAGE_PROXY_PATH = "/api/dashboard/gallery/image"

export function createClinicGalleryImageProxyUrl(token: string) {
  return `${CLINIC_GALLERY_IMAGE_PROXY_PATH}?token=${encodeURIComponent(token)}`
}

export function isClinicGalleryImageProxyUrl(source: unknown) {
  return typeof source === "string" && source.startsWith(`${CLINIC_GALLERY_IMAGE_PROXY_PATH}?token=`)
}
