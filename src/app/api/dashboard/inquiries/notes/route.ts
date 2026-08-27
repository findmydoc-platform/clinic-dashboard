import type { NextRequest } from "next/server"
import { handleInquiryNoteAdd } from "@/features/clinic-dashboard/server"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  return handleInquiryNoteAdd(request)
}
