import type { NextRequest } from "next/server"
import { handleSupportSubmit } from "@/features/clinic-dashboard/server"
export const runtime = "nodejs"
export function POST(request: NextRequest) {
  return handleSupportSubmit(request)
}
