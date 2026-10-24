"use client"
import { CLINIC_DASHBOARD_CSRF_HEADER, readBrowserCsrfToken } from "@/lib/security/csrf-contract"
import type { SupportCommand, SupportRequestResult } from "../model/support-request"
export function createSupportApiCommand(
  clinicId: string,
  onAccessFailure?: (failure: "unauthorized" | "forbidden") => void,
): SupportCommand {
  return async (input) => {
    const csrf = readBrowserCsrfToken(document.cookie)
    if (!csrf) return { status: "failed" }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 25_000)
    try {
      const response = await fetch(`/api/dashboard/clinics/${encodeURIComponent(clinicId)}/support`, {
        method: "POST",
        credentials: "same-origin",
        redirect: "error",
        cache: "no-store",
        headers: { "Content-Type": "application/json", [CLINIC_DASHBOARD_CSRF_HEADER]: csrf },
        body: JSON.stringify(input),
        signal: controller.signal,
      })
      if (response.status === 401 || response.status === 403)
        onAccessFailure?.(response.status === 401 ? "unauthorized" : "forbidden")
      const body: unknown = await response.json().catch(() => null)
      const status = body && typeof body === "object" && "status" in body ? body.status : undefined
      if (
        (response.ok && status === "accepted") ||
        (!response.ok && (status === "failed" || status === "unknown"))
      )
        return { status } as SupportRequestResult
      return { status: "unknown" }
    } catch {
      return { status: "unknown" }
    } finally {
      clearTimeout(timer)
    }
  }
}
