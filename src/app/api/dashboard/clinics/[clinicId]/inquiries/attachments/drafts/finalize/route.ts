import type { NextRequest } from "next/server"
import { handleInquiryAttachmentDraftFinalize } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleInquiryAttachmentDraftFinalize(request)
}
