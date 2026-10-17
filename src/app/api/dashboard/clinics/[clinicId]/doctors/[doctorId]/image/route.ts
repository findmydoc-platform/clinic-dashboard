import type { NextRequest } from "next/server"
import { handleDoctorImageReplace, handleDoctorImageRead } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest, context: { params: Promise<{ doctorId: string }> }) {
  const { doctorId } = await context.params
  return handleDoctorImageReplace(request, doctorId)
}

export async function GET(request: NextRequest, context: { params: Promise<{ doctorId: string }> }) {
  const { doctorId } = await context.params
  return handleDoctorImageRead(request, doctorId)
}
