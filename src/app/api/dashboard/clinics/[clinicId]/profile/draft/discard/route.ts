import type { NextRequest } from "next/server"
import { handleClinicProfileDraftDiscard } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleClinicProfileDraftDiscard(request)
}
