import type { NextRequest } from "next/server"
import { handleReviewHistoryLoad } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export async function GET(request: NextRequest, context: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await context.params
  return handleReviewHistoryLoad(request, reviewId)
}
