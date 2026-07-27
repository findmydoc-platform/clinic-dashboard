import type { NextRequest } from "next/server"
import { handleDoctorCreate } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleDoctorCreate(request)
}
