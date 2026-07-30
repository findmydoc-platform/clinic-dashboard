import type { NextRequest } from "next/server"
import { handleClinicProfileDraftSave } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function PUT(request: NextRequest) {
  return handleClinicProfileDraftSave(request)
}
