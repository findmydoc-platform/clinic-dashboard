import type { NextRequest } from "next/server"
import { handleNotificationsLoad } from "@/features/clinic-dashboard/server"
export function GET(request: NextRequest) {
  return handleNotificationsLoad(request)
}
