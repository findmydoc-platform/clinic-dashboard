import type { NextRequest } from "next/server"
import { handleInquiryAttachmentDownload } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function GET(request: NextRequest) {
  return handleInquiryAttachmentDownload(request)
}
