import "server-only"
import type { NextRequest } from "next/server"
import { resolveClinicDashboardRouteAccess } from "@/features/clinic-dashboard/auth/server/public"
import { createPrivateJsonResponse } from "@/lib/security/private-response"
import { validateMutationRequest } from "@/lib/security/csrf"
import {
  CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
  CLINIC_NOTIFICATIONS_SUPPORT_HEADER,
  notificationReadQuerySchema,
  notificationReadInputSchema,
  NOTIFICATION_READ_MAX_BYTES,
} from "../model/notification-schema"
import { notificationErrorStatuses } from "../notification-response"
import type {
  NotificationLoadState,
  NotificationResult,
  NotificationMarkResult,
} from "../model/notifications"
import type { NotificationProviderFactory } from "./notification-provider"

function resultResponse(result: NotificationResult | NotificationMarkResult) {
  const response = result.ok
    ? createPrivateJsonResponse(result.value)
    : createPrivateJsonResponse(
        {
          contractVersion: CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
          error: { code: result.error },
          ...("writeOutcome" in result ? { writeOutcome: result.writeOutcome } : {}),
        },
        notificationErrorStatuses[result.error],
      )
  response.headers.set(CLINIC_NOTIFICATIONS_SUPPORT_HEADER, CLINIC_NOTIFICATIONS_CONTRACT_VERSION)
  if (!result.ok && result.retryAfter) response.headers.set("Retry-After", result.retryAfter)
  return response
}

export async function handleNotificationsMarkRead(
  request: NextRequest,
  createProvider: NotificationProviderFactory,
) {
  const fail = (
    error:
      | "INVALID_INPUT"
      | "REQUEST_REJECTED"
      | "PAYLOAD_TOO_LARGE"
      | "SERVICE_UNAVAILABLE"
      | "UNAUTHENTICATED"
      | "CLINIC_ACCESS_DENIED",
  ) => resultResponse({ ok: false, error, writeOutcome: "not_committed" })
  if (
    request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json" ||
    !validateMutationRequest(request)
  )
    return fail("REQUEST_REJECTED")
  const access = await resolveClinicDashboardRouteAccess(request)
  if (access.status !== "approved")
    return access.applyToResponse(
      fail(
        access.status === "denied"
          ? "CLINIC_ACCESS_DENIED"
          : access.status === "temporarily-unavailable"
            ? "SERVICE_UNAVAILABLE"
            : "UNAUTHENTICATED",
      ),
    )
  const length = request.headers.get("content-length")
  if (length && (!Number.isSafeInteger(Number(length)) || Number(length) < 0))
    return access.applyToResponse(fail("INVALID_INPUT"))
  if (length && Number(length) > NOTIFICATION_READ_MAX_BYTES)
    return access.applyToResponse(fail("PAYLOAD_TOO_LARGE"))
  const reader = request.body?.getReader()
  if (!reader) return access.applyToResponse(fail("INVALID_INPUT"))
  let text = ""
  let bytes = 0
  const decoder = new TextDecoder("utf-8", { fatal: true })
  let body: unknown
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (bytes > NOTIFICATION_READ_MAX_BYTES) {
        await reader.cancel()
        return access.applyToResponse(fail("PAYLOAD_TOO_LARGE"))
      }
      text += decoder.decode(chunk.value, { stream: true })
    }
    text += decoder.decode()
    body = JSON.parse(text)
  } catch {
    return access.applyToResponse(fail("INVALID_INPUT"))
  } finally {
    reader.releaseLock()
  }
  const input = notificationReadInputSchema.safeParse(body)
  if (!input.success || request.nextUrl.search) return access.applyToResponse(fail("INVALID_INPUT"))
  let provider
  try {
    provider = createProvider(access.accessToken, access.clinicId)
  } catch {
    return access.applyToResponse(fail("SERVICE_UNAVAILABLE"))
  }
  try {
    return access.applyToResponse(resultResponse(await provider.markRead(input.data, request.signal)))
  } catch {
    return access.applyToResponse(
      resultResponse({ ok: false, error: "SERVICE_UNAVAILABLE", writeOutcome: "unknown" }),
    )
  }
}

export async function handleNotificationsLoad(
  request: NextRequest,
  createProvider: NotificationProviderFactory,
) {
  const started = performance.now()
  const finish = (
    result: NotificationResult,
    apply?: (response: ReturnType<typeof resultResponse>) => Response,
  ) => {
    if (!result.ok) {
      try {
        console.error(
          JSON.stringify({
            event: "clinic_dashboard.notifications.read",
            application: "clinic-dashboard",
            contractVersion: CLINIC_NOTIFICATIONS_CONTRACT_VERSION,
            operation: request.nextUrl.searchParams.get("mode") === "summary" ? "summary_read" : "feed_read",
            result: "failure",
            errorCode: result.error,
            elapsedMs: Math.round(performance.now() - started),
          }),
        )
      } catch {
        // Diagnostic failure cannot change the read result.
      }
    }
    const response = resultResponse(result)
    return apply ? apply(response) : response
  }
  const entries = [...request.nextUrl.searchParams.entries()]
  const parsed = notificationReadQuerySchema.safeParse(Object.fromEntries(entries))
  if (!parsed.success || new Set(entries.map(([key]) => key)).size !== entries.length)
    return finish({ ok: false, error: "INVALID_INPUT" })
  let access
  try {
    access = await resolveClinicDashboardRouteAccess(request)
  } catch {
    return finish({ ok: false, error: "SERVICE_UNAVAILABLE" })
  }
  if (access.status !== "approved")
    return finish(
      {
        ok: false,
        error:
          access.status === "denied"
            ? "CLINIC_ACCESS_DENIED"
            : access.status === "temporarily-unavailable"
              ? "SERVICE_UNAVAILABLE"
              : "UNAUTHENTICATED",
      },
      access.applyToResponse,
    )
  try {
    const result = await createProvider(access.accessToken, access.clinicId).load(parsed.data, request.signal)
    return finish(result, access.applyToResponse)
  } catch {
    return finish({ ok: false, error: "SERVICE_UNAVAILABLE" }, access.applyToResponse)
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
