import type { NextRequest } from "next/server"
import { handleDoctorImageReplace } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest, context: { params: Promise<{ doctorId: string }> }) {
  const { doctorId } = await context.params
  return handleDoctorImageReplace(request, doctorId)
}
