import type { NextRequest } from "next/server"
import { handleInquiryAttachmentDraftUpload } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function PUT(request: NextRequest) {
  return handleInquiryAttachmentDraftUpload(request)
}
