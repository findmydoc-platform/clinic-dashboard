import type { NextRequest } from "next/server"
import { handleClinicDashboardReportingLoad } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function GET(request: NextRequest) {
  return handleClinicDashboardReportingLoad(request)
}
