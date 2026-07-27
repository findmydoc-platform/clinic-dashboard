import type { NextRequest } from "next/server"
import { handlePatientInquiryStatusUpdate } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/dashboard/inquiries/[inquiryId]/status">,
) {
  const { inquiryId } = await context.params
  return handlePatientInquiryStatusUpdate(request, inquiryId)
}
