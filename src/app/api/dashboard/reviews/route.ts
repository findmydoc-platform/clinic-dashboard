import type { NextRequest } from "next/server"
import { handleReviewListLoad } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function GET(request: NextRequest) {
  return handleReviewListLoad(request)
}
