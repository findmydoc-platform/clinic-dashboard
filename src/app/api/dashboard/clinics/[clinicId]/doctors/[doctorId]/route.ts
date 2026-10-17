import type { NextRequest } from "next/server"
import { handleDoctorUpdate } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export async function PATCH(request: NextRequest, context: { params: Promise<{ doctorId: string }> }) {
  const { doctorId } = await context.params
  return handleDoctorUpdate(request, doctorId)
}
