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

  it("retains the original explicit clinic for reads, creation and updates", async () => {
    setCsrfCookie("csrf-token")
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 503 }))
    vi.stubGlobal("fetch", fetcher)
    const commands = createClinicTreatmentApiCommands("clinic-a")
    await commands.loadTreatments()
    await commands.createTreatment({ price: 20, treatmentId: "master-a" }).catch(() => undefined)
    await commands
      .updateTreatment("offering-a", {
        active: false,
        expectedRevision: "2026-01-01T00:00:00.000Z",
        price: 30,
      })
      .catch(() => undefined)
    expect(fetcher.mock.calls.map(([url]) => new URL(String(url), window.location.origin).pathname)).toEqual([
      "/api/dashboard/clinics/clinic-a/clinic-treatments",
      "/api/dashboard/clinics/clinic-a/clinic-treatments",
      "/api/dashboard/clinics/clinic-a/clinic-treatments",
    ])
  })

  it.each([401, 403])("reports source denial %s before the caller can clear its draft", async (status) => {
    setCsrfCookie("csrf-token")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status })),
    )
    const onAccessFailure = vi.fn()
    const commands = createClinicTreatmentApiCommands("clinic-a", onAccessFailure)
    await commands.loadTreatments()
    expect(onAccessFailure).toHaveBeenLastCalledWith(status === 401 ? "unauthorized" : "forbidden")
    onAccessFailure.mockClear()
    await commands.createTreatment({ price: 20, treatmentId: "master-a" }).catch(() => undefined)
    expect(onAccessFailure).toHaveBeenLastCalledWith(status === 401 ? "unauthorized" : "forbidden")
  })

  it("maps duplicate assignments to a conflict command error", async () => {
    setCsrfCookie("csrf-token")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 409 })),
    )

    const result = createClinicTreatmentApiCommands("clinic-a").createTreatment({
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
      createClinicTreatmentApiCommands("clinic-a").createTreatment({
        price: 0,
        treatmentId: "treatment-1",
      }),
    ).rejects.toMatchObject({ code: "unknown" })
  })
})
