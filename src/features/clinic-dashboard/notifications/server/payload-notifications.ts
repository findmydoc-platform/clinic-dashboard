import "server-only"
import { validateEnvironment } from "@/lib/env"
import { clinicDashboardContractHeaders } from "../../payload-contract"
import {
  CLINIC_NOTIFICATIONS_CONTRACT_HEADER,
  CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
  NOTIFICATION_READ_MAX_BYTES,
  notificationReadInputSchema,
} from "../model/notification-schema"
import { readNotificationResponse, readNotificationMarkResponse } from "../notification-response"
import type { NotificationProvider } from "./notification-provider"

export function createPayloadNotificationProvider(
  accessToken: string,
  principalId: string,
  fetcher: typeof fetch = fetch,
  environment: Record<string, string | undefined> = process.env,
): NotificationProvider {
  if (!accessToken.trim() || !principalId.trim()) throw new Error("Verified personal clinic session required")
  const validated = validateEnvironment(environment)
  return {
    async markRead(input, signal) {
      const parsed = notificationReadInputSchema.safeParse(input)
      if (!parsed.success) return { ok: false, error: "INVALID_INPUT", writeOutcome: "not_committed" }
      const body = JSON.stringify(parsed.data)
      if (new TextEncoder().encode(body).byteLength > NOTIFICATION_READ_MAX_BYTES)
        return { ok: false, error: "PAYLOAD_TOO_LARGE", writeOutcome: "not_committed" }
      const timeout = AbortSignal.timeout(8_000)
      try {
        const response = await fetcher(
          new URL("/api/clinic-dashboard/notifications/read", validated.PAYLOAD_API_URL),
          {
            method: "POST",
            body,
            cache: "no-store",
            redirect: "error",
            signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Origin: new URL(validated.DASHBOARD_ORIGIN).origin,
              Authorization: `Bearer ${accessToken}`,
              ...clinicDashboardContractHeaders(),
              [CLINIC_NOTIFICATIONS_CONTRACT_HEADER]: CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
            },
          },
        )
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
          !vary.includes("x-findmydoc-clinic-scope-contract") ||
          !vary.includes(CLINIC_NOTIFICATIONS_CONTRACT_HEADER.toLowerCase())
        )
          return { ok: false, error: "CONTRACT_INCOMPATIBLE", writeOutcome: "unknown" }
        return await readNotificationMarkResponse(response)
      } catch {
        return {
          ok: false,
          error: timeout.aborted ? "SERVICE_TIMEOUT" : "SERVICE_UNAVAILABLE",
          writeOutcome: "unknown",
        }
      }
    },
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
          !vary.includes("x-findmydoc-clinic-scope-contract") ||
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
