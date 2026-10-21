import type { NextRequest } from "next/server"
import { handleClinicGalleryImage } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  return handleClinicGalleryImage(request)
}
