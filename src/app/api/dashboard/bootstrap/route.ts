import type { NextRequest } from "next/server"
import { handleClinicDashboardBootstrap } from "@/features/clinic-dashboard/auth/server/public"

export const runtime = "nodejs"

export function GET(request: NextRequest) {
  return handleClinicDashboardBootstrap(request)
}
