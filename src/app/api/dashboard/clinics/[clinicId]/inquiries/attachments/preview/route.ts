import type { NextRequest } from "next/server"
import { handleInquiryAttachmentPreview } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function GET(request: NextRequest) {
  return handleInquiryAttachmentPreview(request)
}
