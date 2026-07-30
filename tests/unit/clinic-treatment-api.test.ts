// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { createClinicTreatmentApiCommands } from "@/features/clinic-dashboard/clinic-profile/browser/clinic-treatment-api"
import { ClinicTreatmentCommandError } from "@/features/clinic-dashboard/clinic-profile/model/clinic-treatment-commands"
import { CLINIC_DASHBOARD_CSRF_COOKIE } from "@/lib/security/csrf-contract"

function setCsrfCookie(value: string) {
  document.cookie = `${CLINIC_DASHBOARD_CSRF_COOKIE}=${encodeURIComponent(value)}; path=/`
}

describe("Clinic treatment browser API", () => {
  afterEach(() => {
    document.cookie = `${CLINIC_DASHBOARD_CSRF_COOKIE}=; max-age=0; path=/`
    vi.unstubAllGlobals()
  })

  it("maps duplicate assignments to a conflict command error", async () => {
    setCsrfCookie("csrf-token")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 409 })),
    )

    const result = createClinicTreatmentApiCommands().createTreatment({
      active: false,
      price: 0,
      treatmentId: "treatment-1",
    })
    await expect(result).rejects.toBeInstanceOf(ClinicTreatmentCommandError)
    await expect(result).rejects.toMatchObject({ code: "conflict" })
  })

  it("fails closed for an invalid success response", async () => {
    setCsrfCookie("csrf-token")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: "offering-1" }), { status: 201 })),
    )

    await expect(
      createClinicTreatmentApiCommands().createTreatment({
        active: false,
        price: 0,
        treatmentId: "treatment-1",
      }),
    ).rejects.toMatchObject({ code: "unknown" })
  })
})
