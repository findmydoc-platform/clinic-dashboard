import type { NextRequest } from "next/server"
import { handleInquiryAppealSubmit } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleInquiryAppealSubmit(request)
}
