"use client"

export function createInquiryAttachmentAccessPaths(attachmentId: string) {
  const query = new URLSearchParams({ attachmentId })
  return {
    download: `/api/dashboard/inquiries/attachments/download?${query}`,
    preview: `/api/dashboard/inquiries/attachments/preview?${query}`,
  } as const
}
