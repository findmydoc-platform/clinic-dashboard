import type { NextRequest } from "next/server"
import {
  handleClinicProfileDraftCreate,
  handleClinicProfileDraftSave,
} from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function PUT(request: NextRequest) {
  return handleClinicProfileDraftSave(request)
}

export function POST(request: NextRequest) {
  return handleClinicProfileDraftCreate(request)
}
