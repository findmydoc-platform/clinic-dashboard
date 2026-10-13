import "server-only"
import type { NextRequest } from "next/server"
import { resolveClinicDashboardRouteAccess } from "@/features/clinic-dashboard/auth/server/public"
import { createPrivateJsonResponse } from "@/lib/security/private-response"
import {
  CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
  CLINIC_NOTIFICATIONS_SUPPORT_HEADER,
  notificationReadQuerySchema,
} from "../model/notification-schema"
import { notificationErrorStatuses } from "../notification-response"
import type { NotificationLoadState, NotificationResult } from "../model/notifications"
import type { NotificationProviderFactory } from "./notification-provider"

function resultResponse(result: NotificationResult) {
  const response = result.ok
    ? createPrivateJsonResponse(result.value)
    : createPrivateJsonResponse(
        {
          contractVersion: CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
          error: { code: result.error },
        },
        notificationErrorStatuses[result.error],
      )
  response.headers.set(CLINIC_NOTIFICATIONS_SUPPORT_HEADER, CLINIC_NOTIFICATIONS_CONTRACT_VERSION)
  if (!result.ok && result.retryAfter) response.headers.set("Retry-After", result.retryAfter)
  return response
}

export async function handleNotificationsLoad(
  request: NextRequest,
  createProvider: NotificationProviderFactory,
) {
  const entries = [...request.nextUrl.searchParams.entries()]
  const parsed = notificationReadQuerySchema.safeParse(Object.fromEntries(entries))
  if (!parsed.success || new Set(entries.map(([key]) => key)).size !== entries.length)
    return resultResponse({ ok: false, error: "INVALID_INPUT" })
  const access = await resolveClinicDashboardRouteAccess(request)
  if (access.status !== "approved")
    return access.applyToResponse(
      resultResponse({
        ok: false,
        error:
          access.status === "denied"
            ? "CLINIC_ACCESS_DENIED"
            : access.status === "temporarily-unavailable"
              ? "SERVICE_UNAVAILABLE"
              : "UNAUTHENTICATED",
      }),
    )
  try {
    const result = await createProvider(access.accessToken, access.clinicId).load(parsed.data, request.signal)
    return access.applyToResponse(resultResponse(result))
  } catch {
    return access.applyToResponse(resultResponse({ ok: false, error: "SERVICE_UNAVAILABLE" }))
  }
}

export async function loadInitialNotifications(
  accessToken: string,
  clinicId: string,
  createProvider: NotificationProviderFactory,
): Promise<NotificationLoadState> {
  try {
    const result = await createProvider(accessToken, clinicId).load({ mode: "summary" })
    return result.ok
      ? { status: "ready", response: result.value }
      : { status: "unavailable", error: result.error }
  } catch {
    return { status: "unavailable", error: "SERVICE_UNAVAILABLE" }
  }
}
