import type { NextRequest } from "next/server"
import { handleInquiryQueueLoad } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function GET(request: NextRequest) {
  return handleInquiryQueueLoad(request)
}
