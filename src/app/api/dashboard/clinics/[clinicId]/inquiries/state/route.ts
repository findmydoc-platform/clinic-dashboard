import type { NextRequest } from "next/server"
import { handleInquiryStateChange } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function PATCH(request: NextRequest) {
  return handleInquiryStateChange(request)
}
