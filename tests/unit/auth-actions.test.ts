import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  encodeCompletionGrant,
  encodePendingEmailCallback,
  handleClinicDashboardEmailCallback,
  handleClinicDashboardLogin,
  handleClinicDashboardLogout,
  handleClinicDashboardPasswordCompletion,
  handleClinicDashboardPasswordResetRequest,
} from "@/features/clinic-dashboard/auth/server/public"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

function mutationRequest(
  pathname: string,
  body: Record<string, string>,
  session = false,
  pendingCallback?: Readonly<{
    next: "/auth/invite/complete" | "/auth/password/reset/complete"
    tokenHash: string
    type: "invite" | "recovery"
  }>,
  completionFlow?: "invite" | "recovery",
) {
  const url = `http://localhost:3000${pathname}`
  const baseRequest = new NextRequest(url, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    method: "POST",
  })
  const token = createCsrfToken(baseRequest)
  const cookies = [
    `clinic_dashboard_csrf=${token}`,
    ...(session ? ["clinic_dashboard_controlled_session=controlled-clinic-staff"] : []),
    ...(pendingCallback
      ? [`clinic_dashboard_pending_email=${encodePendingEmailCallback(pendingCallback)}`]
      : []),
    ...(completionFlow
      ? [
          `clinic_dashboard_completion_grant=${encodeCompletionGrant({
            flow: completionFlow,
            issuedAt: Math.floor(Date.now() / 1000),
            subject: "controlled-clinic-staff",
          })}`,
        ]
      : []),
  ]
  return new NextRequest(url, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      cookie: cookies.join("; "),
      origin: "http://localhost:3000",
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
    },
    method: "POST",
  })
}

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe("private, no-store")
  expect(response.headers.get("pragma")).toBe("no-cache")
  expect(response.headers.get("expires")).toBe("0")
}

describe("controlled authentication route contract", () => {
  beforeEach(() => {
    vi.stubEnv("CLINIC_DASHBOARD_AUTH_TEST_MODE", "controlled")
    vi.stubEnv("CLINIC_DASHBOARD_TEST_PASSWORD", "test-password")
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
  })

  afterEach(() => vi.unstubAllEnvs())

  it("logs in with email and password without exposing credentials", async () => {
    const response = await handleClinicDashboardLogin(
      mutationRequest("/api/auth/login", {
        email: "clinic-staff@example.com",
        next: "/",
        password: "test-password",
      }),
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ redirectTo: "/" })
    expect(response.headers.get("set-cookie")).toContain("clinic_dashboard_controlled_session")
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    expectPrivate(response)

    const invalid = await handleClinicDashboardLogin(
      mutationRequest("/api/auth/login", {
        email: "clinic-staff@example.com",
        next: "/",
        password: "wrong-password",
      }),
    )
    expect(invalid.status).toBe(401)
    await expect(invalid.json()).resolves.toEqual({ code: "INVALID_CREDENTIALS" })
    expectPrivate(invalid)
  })

  it("returns the neutral reset response for every syntactically valid email", async () => {
    for (const email of ["clinic-staff@example.com", "unknown@example.com"]) {
      const response = await handleClinicDashboardPasswordResetRequest(
        mutationRequest("/api/auth/password/reset", { email }),
      )
      expect(response.status).toBe(202)
      await expect(response.json()).resolves.toEqual({ accepted: true })
      expectPrivate(response)
    }
  })

  it("verifies only the exact token hash and flow destination", async () => {
    const response = await handleClinicDashboardEmailCallback(
      mutationRequest("/api/auth/callback", {}, false, {
        next: "/auth/invite/complete",
        tokenHash: "controlled-invite-token",
        type: "invite",
      }),
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ redirectTo: "/auth/invite/complete" })
    expectPrivate(response)

    const invalid = await handleClinicDashboardEmailCallback(
      mutationRequest("/api/auth/callback", {}, false, {
        next: "/auth/invite/complete",
        tokenHash: "wrong-token",
        type: "invite",
      }),
    )
    expect(invalid.status).toBe(400)
    await expect(invalid.json()).resolves.toEqual({ code: "INVALID_OR_EXPIRED_LINK" })
    expectPrivate(invalid)
  })

  it.each(["invite", "recovery"] as const)("completes %s and removes the local session", async (flow) => {
    const response = await handleClinicDashboardPasswordCompletion(
      mutationRequest(
        flow === "invite" ? "/api/auth/invite/complete" : "/api/auth/password/reset/complete",
        { confirmPassword: "new-password", password: "new-password" },
        true,
        undefined,
        flow,
      ),
      flow,
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ redirectTo: `/login?status=${flow}-complete` })
    expect(response.headers.get("set-cookie")).toContain("clinic_dashboard_controlled_session=;")
    expect(response.headers.get("set-cookie")).toContain("clinic_dashboard_completion_grant=;")
    expectPrivate(response)
  })

  it("rejects password completion without the callback-bound flow grant", async () => {
    const response = await handleClinicDashboardPasswordCompletion(
      mutationRequest(
        "/api/auth/invite/complete",
        { confirmPassword: "new-password", password: "new-password" },
        true,
      ),
      "invite",
    )
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ code: "INVALID_OR_EXPIRED_LINK" })
    expect(response.headers.get("set-cookie")).toContain("clinic_dashboard_completion_grant=;")
    expectPrivate(response)
  })

  it("logs out through a CSRF-protected JSON mutation", async () => {
    const response = await handleClinicDashboardLogout(mutationRequest("/api/auth/logout", {}, true))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ redirectTo: "/login" })
    expect(response.headers.get("set-cookie")).toContain("clinic_dashboard_controlled_session=;")
    expectPrivate(response)
  })

  it("rejects missing CSRF proof before parsing credentials", async () => {
    const response = await handleClinicDashboardLogin(
      new NextRequest("http://localhost:3000/api/auth/login", {
        body: JSON.stringify({}),
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        method: "POST",
      }),
    )
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ code: "REQUEST_REJECTED" })
    expectPrivate(response)
  })

  it("rejects an oversized authentication body before schema processing", async () => {
    const response = await handleClinicDashboardLogin(
      mutationRequest("/api/auth/login", {
        email: "clinic-staff@example.com",
        next: "/",
        password: "x".repeat(9_000),
      }),
    )
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ code: "INVALID_INPUT" })
    expectPrivate(response)
  })
})
