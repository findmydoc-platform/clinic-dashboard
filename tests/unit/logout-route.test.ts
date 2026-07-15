import { describe, expect, it } from "vitest"
import { POST } from "@/app/api/auth/logout/route"
import { DASHBOARD_AUTH_COOKIE } from "@/lib/security/dashboard-auth"

describe("temporary dashboard logout", () => {
  it("clears the session cookie and redirects to login", async () => {
    const response = await POST(
      new Request("https://clinics.example/api/auth/logout", {
        headers: { host: "clinics.example" },
        method: "POST",
      }),
    )

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("https://clinics.example/login")
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(response.headers.get("set-cookie")).toContain(`${DASHBOARD_AUTH_COOKIE}=;`)
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0")
  })
})
