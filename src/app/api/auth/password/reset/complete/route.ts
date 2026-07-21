import type { NextRequest } from "next/server"
import { handleClinicDashboardPasswordCompletion } from "@/features/clinic-dashboard/auth/server/public"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleClinicDashboardPasswordCompletion(request, "recovery")
}
