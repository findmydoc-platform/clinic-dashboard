import type { NextRequest } from "next/server"
import { handleInquiryContactReveal } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleInquiryContactReveal(request)
}
