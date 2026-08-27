import type { NextRequest } from "next/server"
import { handleInquiryAttachmentDraftCreate } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleInquiryAttachmentDraftCreate(request)
}
