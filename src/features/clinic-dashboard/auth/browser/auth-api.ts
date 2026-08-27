"use client"

import { CLINIC_DASHBOARD_CSRF_HEADER, readBrowserCsrfToken } from "@/lib/security/csrf-contract"
import type { ClinicDashboardAuthErrorCode } from "../model/auth"

export type ClinicDashboardAuthEndpoint =
  | "/api/auth/callback"
  | "/api/auth/invite/complete"
  | "/api/auth/login"
  | "/api/auth/logout"
  | "/api/auth/password/reset"
  | "/api/auth/password/reset/complete"

export type ClinicDashboardAuthApiResult =
  | Readonly<{ body: Record<string, unknown>; ok: true }>
  | Readonly<{ code: ClinicDashboardAuthErrorCode; ok: false }>

export type ClinicDashboardReauthenticationResult = Readonly<{
  status: "invalid-credentials" | "reauthenticated" | "session-ended" | "temporarily-unavailable"
}>

export type ClinicDashboardReauthenticationCommand = (
  password: string,
) => Promise<ClinicDashboardReauthenticationResult>

const knownErrorCodes = new Set<ClinicDashboardAuthErrorCode>([
  "INVALID_INPUT",
  "INVALID_CREDENTIALS",
  "INVALID_OR_EXPIRED_LINK",
  "ACCOUNT_UNAVAILABLE",
  "REQUEST_REJECTED",
  "AUTH_TEMPORARILY_UNAVAILABLE",
  "SERVICE_TEMPORARILY_UNAVAILABLE",
])

export async function submitClinicDashboardAuthAction(
  endpoint: ClinicDashboardAuthEndpoint,
  body: Record<string, string>,
): Promise<ClinicDashboardAuthApiResult> {
  const csrfToken = readBrowserCsrfToken(document.cookie)

  if (!csrfToken) return { code: "REQUEST_REJECTED", ok: false }

  try {
    const response = await fetch(endpoint, {
      body: JSON.stringify(body),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        [CLINIC_DASHBOARD_CSRF_HEADER]: csrfToken,
      },
      method: "POST",
      redirect: "error",
    })
    const responseBody = (await response.json().catch(() => ({}))) as Record<string, unknown>

    if (response.ok) return { body: responseBody, ok: true }

    const code = responseBody.code
    return {
      code:
        typeof code === "string" && knownErrorCodes.has(code as ClinicDashboardAuthErrorCode)
          ? (code as ClinicDashboardAuthErrorCode)
          : response.status === 503
            ? "SERVICE_TEMPORARILY_UNAVAILABLE"
            : "REQUEST_REJECTED",
      ok: false,
    }
  } catch {
    return { code: "SERVICE_TEMPORARILY_UNAVAILABLE", ok: false }
  }
}

export const reauthenticateClinicDashboardSession: ClinicDashboardReauthenticationCommand = async (
  password,
) => {
  const csrfToken = readBrowserCsrfToken(document.cookie)
  if (!csrfToken) return { status: "temporarily-unavailable" }

  try {
    const response = await fetch("/api/auth/reauthenticate", {
      body: JSON.stringify({ password }),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        [CLINIC_DASHBOARD_CSRF_HEADER]: csrfToken,
      },
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    })
    const responseBody = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (response.ok) {
      return responseBody.reauthenticated === true
        ? { status: "reauthenticated" }
        : { status: "temporarily-unavailable" }
    }
    if (responseBody.code === "INVALID_CREDENTIALS") return { status: "invalid-credentials" }
    if (responseBody.code === "ACCOUNT_UNAVAILABLE") return { status: "session-ended" }
    return { status: "temporarily-unavailable" }
  } catch {
    return { status: "temporarily-unavailable" }
  }
}
