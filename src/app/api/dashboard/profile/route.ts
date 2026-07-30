import type { NextRequest } from "next/server"
import { handleClinicProfileLoad } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function GET(request: NextRequest) {
  return handleClinicProfileLoad(request)
}
