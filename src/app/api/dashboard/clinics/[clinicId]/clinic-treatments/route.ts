import type { NextRequest } from "next/server"
import {
  handleClinicTreatmentCreate,
  handleClinicTreatmentRead,
  handleClinicTreatmentUpdate,
} from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  return handleClinicTreatmentRead(request)
}

export function POST(request: NextRequest) {
  return handleClinicTreatmentCreate(request)
}

export function PATCH(request: NextRequest) {
  return handleClinicTreatmentUpdate(request)
}
