import type { NextRequest } from "next/server"
import { handleInquiryAttachmentDraftDiscard } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleInquiryAttachmentDraftDiscard(request)
}
