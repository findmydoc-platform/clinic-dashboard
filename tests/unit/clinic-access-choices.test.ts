import { expect, it, vi } from "vitest"
import { loadClinicDashboardChoices } from "@/features/clinic-dashboard/auth/public"

it("loads fresh trusted personal choices through the private same-origin BFF", async () => {
  const context = {
    schemaVersion: "clinic-scope-v1",
    status: "approved",
    principal: { id: "staff-1", displayName: "Synthetic Person", email: "person@example.invalid" },
    clinics: [{ id: "clinic-2", name: "Alternative Clinic", capabilities: ["clinic-inquiries:view"] }],
  }
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json(context, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } }),
    )
  expect(await loadClinicDashboardChoices(fetcher)).toEqual({ status: "approved", context })
  const [url, options] = fetcher.mock.calls[0]!
  expect(url).toBe("/api/dashboard/bootstrap")
  expect(options).toMatchObject({ cache: "no-store", credentials: "same-origin" })
})

it("does not turn an unverified 401 response into session loss", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json(
        { code: "UNRELATED_PROXY_ERROR" },
        { status: 401, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
      ),
    )
  expect(await loadClinicDashboardChoices(fetcher)).toEqual({ status: "temporarily-unavailable" })
})
