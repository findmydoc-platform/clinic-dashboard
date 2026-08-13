import type { NextRequest } from "next/server"
import { handleReviewAppealSubmit } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest, context: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await context.params
  return handleReviewAppealSubmit(request, reviewId)
}
