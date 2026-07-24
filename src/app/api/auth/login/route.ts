import type { NextRequest } from "next/server"
import { handleClinicDashboardLogin } from "@/features/clinic-dashboard/auth/server/public"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleClinicDashboardLogin(request)
}
