import type { NextRequest } from "next/server"
import { handleClinicProfilePublish } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleClinicProfilePublish(request)
}
