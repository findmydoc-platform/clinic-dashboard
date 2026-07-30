import type { NextRequest } from "next/server"
import { handleClinicDashboardLogout } from "@/features/clinic-dashboard/auth/server/public"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleClinicDashboardLogout(request)
}
