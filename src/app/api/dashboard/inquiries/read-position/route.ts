import type { NextRequest } from "next/server"
import { handleInquiryReadPositionChange } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function PUT(request: NextRequest) {
  return handleInquiryReadPositionChange(request)
}
