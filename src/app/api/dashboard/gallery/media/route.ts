import type { NextRequest } from "next/server"
import { handleClinicGalleryUpload } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function POST(request: NextRequest) {
  return handleClinicGalleryUpload(request)
}
