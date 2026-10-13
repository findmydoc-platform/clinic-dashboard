import "server-only"
import { validateEnvironment } from "@/lib/env"
import { clinicDashboardContractHeaders } from "../../payload-contract"
import {
  CLINIC_NOTIFICATIONS_CONTRACT_HEADER,
  CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
} from "../model/notification-schema"
import { readNotificationResponse } from "../notification-response"
import type { NotificationProvider } from "./notification-provider"

export function createPayloadNotificationProvider(
  accessToken: string,
  clinicId: string,
  fetcher: typeof fetch = fetch,
  environment: Record<string, string | undefined> = process.env,
): NotificationProvider {
  if (!accessToken.trim() || !clinicId.trim()) throw new Error("Verified clinic session required")
  const validated = validateEnvironment(environment)
  return {
    async load(query, signal) {
      const url = new URL("/api/clinic-dashboard/notifications", validated.PAYLOAD_API_URL)
      Object.entries(query).forEach(([name, value]) => url.searchParams.set(name, value))
      const timeout = AbortSignal.timeout(8_000)
      try {
        const response = await fetcher(url, {
          cache: "no-store",
          redirect: "error",
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
            ...clinicDashboardContractHeaders(),
            [CLINIC_NOTIFICATIONS_CONTRACT_HEADER]: CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
          },
        })
        const cache =
          response.headers
            .get("cache-control")
            ?.toLowerCase()
            .split(",")
            .map((s) => s.trim()) ?? []
        const vary =
          response.headers
            .get("vary")
            ?.toLowerCase()
            .split(",")
            .map((s) => s.trim()) ?? []
        if (
          !cache.includes("private") ||
          !cache.includes("no-store") ||
          !vary.includes("authorization") ||
          !vary.includes(CLINIC_NOTIFICATIONS_CONTRACT_HEADER.toLowerCase())
        )
          return { ok: false, error: "CONTRACT_INCOMPATIBLE" }
        return await readNotificationResponse(response, query)
      } catch {
        return { ok: false, error: timeout.aborted ? "SERVICE_TIMEOUT" : "SERVICE_UNAVAILABLE" }
      }
    },
  }
}
