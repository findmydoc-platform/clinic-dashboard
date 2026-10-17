import type { NextRequest } from "next/server"
import { handleDoctorSpecialtyUpdate } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ assignmentId: string; doctorId: string }> },
) {
  const { assignmentId, doctorId } = await context.params
  return handleDoctorSpecialtyUpdate(request, doctorId, assignmentId)
}
