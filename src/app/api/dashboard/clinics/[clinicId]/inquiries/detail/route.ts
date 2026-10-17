import type { NextRequest } from "next/server"
import { handleInquiryDetailLoad } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function GET(request: NextRequest) {
  return handleInquiryDetailLoad(request)
}
