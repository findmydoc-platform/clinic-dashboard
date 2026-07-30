// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { createDoctorProfileApiCommands } from "@/features/clinic-dashboard/clinic-profile/browser/doctor-profile-api"
import { DoctorProfileCommandError } from "@/features/clinic-dashboard/clinic-profile/model/doctor-profile-commands"
import { CLINIC_DASHBOARD_CSRF_COOKIE } from "@/lib/security/csrf-contract"

const doctorInput = {
  firstName: "Amelia",
  gender: "female",
  languages: ["english"],
  lastName: "Carter",
  qualifications: ["MD"],
} as const

function setCsrfCookie(value: string) {
  document.cookie = `${CLINIC_DASHBOARD_CSRF_COOKIE}=${encodeURIComponent(value)}; path=/`
}

function clearCsrfCookie() {
  document.cookie = `${CLINIC_DASHBOARD_CSRF_COOKIE}=; max-age=0; path=/`
}

describe("Doctor profile browser API", () => {
  afterEach(() => {
    clearCsrfCookie()
    vi.unstubAllGlobals()
  })

  it("marks a non-success create response as definitively rejected", async () => {
    setCsrfCookie("csrf-token")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 400 })),
    )

    const result = createDoctorProfileApiCommands().createDoctor(doctorInput)

    await expect(result).rejects.toBeInstanceOf(DoctorProfileCommandError)
    await expect(result).rejects.toMatchObject({ outcome: "rejected" })
  })

  it("marks a network failure as an unknown create outcome", async () => {
    setCsrfCookie("csrf-token")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    )

    await expect(createDoctorProfileApiCommands().createDoctor(doctorInput)).rejects.toMatchObject({
      outcome: "unknown",
    })
  })

  it("marks an invalid success response as an unknown create outcome", async () => {
    setCsrfCookie("csrf-token")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: "doctor-1" }), { status: 201 })),
    )

    await expect(createDoctorProfileApiCommands().createDoctor(doctorInput)).rejects.toMatchObject({
      outcome: "unknown",
    })
  })
})
