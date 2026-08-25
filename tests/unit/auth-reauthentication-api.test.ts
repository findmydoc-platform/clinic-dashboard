// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { reauthenticateClinicDashboardSession } from "@/features/clinic-dashboard/auth/public"

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  })
}

describe("clinic dashboard browser reauthentication", () => {
  beforeEach(() => {
    document.cookie = "clinic_dashboard_csrf=test-csrf-token; path=/"
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("reauthenticates through the auth module without exposing transport details to callers", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse({ reauthenticated: true }))
    vi.stubGlobal("fetch", fetcher)

    await expect(reauthenticateClinicDashboardSession("test-password")).resolves.toEqual({
      status: "reauthenticated",
    })
    expect(fetcher).toHaveBeenCalledWith(
      "/api/auth/reauthenticate",
      expect.objectContaining({
        body: JSON.stringify({ password: "test-password" }),
        credentials: "same-origin",
        headers: expect.objectContaining({ "x-csrf-token": "test-csrf-token" }),
        method: "POST",
      }),
    )
  })

  it.each([
    ["INVALID_CREDENTIALS", "invalid-credentials"],
    ["ACCOUNT_UNAVAILABLE", "session-ended"],
    ["REQUEST_REJECTED", "temporarily-unavailable"],
    ["UNKNOWN_AUTH_CODE", "temporarily-unavailable"],
  ] as const)("maps %s to the semantic %s outcome", async (code, status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ code }, 401)),
    )

    await expect(reauthenticateClinicDashboardSession("wrong-password")).resolves.toEqual({ status })
  })

  it("fails safely before transport when the CSRF proof is unavailable", async () => {
    document.cookie = "clinic_dashboard_csrf=; Max-Age=0; path=/"
    const fetcher = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", fetcher)

    await expect(reauthenticateClinicDashboardSession("test-password")).resolves.toEqual({
      status: "temporarily-unavailable",
    })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
