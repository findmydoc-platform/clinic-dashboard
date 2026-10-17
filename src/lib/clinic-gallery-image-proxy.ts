const clinicGalleryImageProxyPath = (clinicId: string) =>
  `/api/dashboard/clinics/${encodeURIComponent(clinicId)}/gallery/image`

export function createClinicGalleryImageProxyUrl(token: string, clinicId: string) {
  return `${clinicGalleryImageProxyPath(clinicId)}?token=${encodeURIComponent(token)}`
}

export function isClinicGalleryImageProxyUrl(source: unknown) {
  return (
    typeof source === "string" && /^\/api\/dashboard\/clinics\/[^/]+\/gallery\/image\?token=/u.test(source)
  )
}
