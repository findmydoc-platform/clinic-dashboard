import type { NextRequest } from "next/server"
import { handleClinicDashboardReauthenticate } from "@/features/clinic-dashboard/auth/server/public"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleClinicDashboardReauthenticate(request)
}
