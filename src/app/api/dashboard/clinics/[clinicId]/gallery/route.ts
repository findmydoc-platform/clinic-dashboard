import type { NextRequest } from "next/server"
import { handleClinicGalleryRead, handleClinicGallerySave } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  return handleClinicGalleryRead(request)
}

export function PUT(request: NextRequest) {
  return handleClinicGallerySave(request)
}
