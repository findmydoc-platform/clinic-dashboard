"use client"

export function createInquiryAttachmentAccessPaths(attachmentId: string, clinicId: string) {
  const query = new URLSearchParams({ attachmentId })
  return {
    download: `/api/dashboard/clinics/${encodeURIComponent(clinicId)}/inquiries/attachments/download?${query}`,
    preview: `/api/dashboard/clinics/${encodeURIComponent(clinicId)}/inquiries/attachments/preview?${query}`,
  } as const
}
