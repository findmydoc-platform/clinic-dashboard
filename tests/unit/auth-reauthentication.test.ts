import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { handleClinicDashboardReauthenticate } from "@/features/clinic-dashboard/auth/server/public"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

function request(password: string, accessState?: "denied" | "outage") {
  const session = [
    "clinic_dashboard_controlled_session=controlled-clinic-staff",
    ...(accessState ? [`clinic_dashboard_controlled_access_state=${accessState}`] : []),
  ].join("; ")
  const base = new NextRequest("http://localhost:3000/api/auth/reauthenticate", {
    body: JSON.stringify({ password }),
    headers: {
      "content-type": "application/json",
      cookie: session,
      origin: "http://localhost:3000",
    },
    method: "POST",
  })
  const token = createCsrfToken(base)
  return new NextRequest("http://localhost:3000/api/auth/reauthenticate", {
    body: JSON.stringify({ password }),
    headers: {
      "content-type": "application/json",
      cookie: `${session}; clinic_dashboard_csrf=${token}`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
      origin: "http://localhost:3000",
    },
    method: "POST",
  })
}

describe("clinic contact reveal reauthentication", () => {
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

  it("reauthenticates only the current session with a password-only body", async () => {
    const response = await handleClinicDashboardReauthenticate(request("test-password"))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ reauthenticated: true })
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("set-cookie")).toContain("clinic_dashboard_controlled_contact_reauth=")
    expect(response.headers.get("set-cookie")).toContain("Max-Age=300")
  })

  it("rejects an invalid password without changing the session", async () => {
    const response = await handleClinicDashboardReauthenticate(request("wrong-password"))
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ code: "INVALID_CREDENTIALS" })
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("rejects step-up when the current clinic session is no longer approved", async () => {
    const response = await handleClinicDashboardReauthenticate(request("test-password", "denied"))
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ code: "REQUEST_REJECTED" })
    expect(response.headers.get("set-cookie")).toBeNull()
  })
})
