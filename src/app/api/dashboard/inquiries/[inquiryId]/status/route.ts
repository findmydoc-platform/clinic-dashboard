import type { NextRequest } from "next/server"
import { handlePatientInquiryStatusUpdate } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export async function PATCH(request: NextRequest, context: { params: Promise<{ inquiryId: string }> }) {
  const { inquiryId } = await context.params
  return handlePatientInquiryStatusUpdate(request, inquiryId)
}
