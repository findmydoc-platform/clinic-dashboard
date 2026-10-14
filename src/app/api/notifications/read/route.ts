import type { NextRequest } from "next/server"
import { handleNotificationsMarkRead } from "@/features/clinic-dashboard/server"
export function POST(request: NextRequest) {
  return handleNotificationsMarkRead(request)
}
