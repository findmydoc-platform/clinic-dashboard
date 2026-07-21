import type { NextRequest } from "next/server"
import { handleClinicDashboardEmailCallback } from "@/features/clinic-dashboard/auth/server/public"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleClinicDashboardEmailCallback(request)
}
