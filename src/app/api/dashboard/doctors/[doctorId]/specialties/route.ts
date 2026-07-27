import type { NextRequest } from "next/server"
import { handleDoctorSpecialtyCreate } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest, context: { params: Promise<{ doctorId: string }> }) {
  const { doctorId } = await context.params
  return handleDoctorSpecialtyCreate(request, doctorId)
}
