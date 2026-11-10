import type { NextRequest } from "next/server"
import { handleInquiryOpenInventoryLoad } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function GET(request: NextRequest) {
  return handleInquiryOpenInventoryLoad(request)
}
