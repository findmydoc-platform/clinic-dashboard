import type { NextRequest } from "next/server"
import { handleClinicDashboardPasswordResetRequest } from "@/features/clinic-dashboard/auth/server/public"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleClinicDashboardPasswordResetRequest(request)
}
