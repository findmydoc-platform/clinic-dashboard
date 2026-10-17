import type { NextRequest } from "next/server"
import { handleInquiryMessageSend } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleInquiryMessageSend(request)
}
