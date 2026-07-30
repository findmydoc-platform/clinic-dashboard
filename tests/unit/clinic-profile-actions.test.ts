import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ClinicProfileProviderFactory } from "@/features/clinic-dashboard/clinic-profile/server/clinic-profile-provider"

const accessMocks = vi.hoisted(() => ({
  resolveClinicDashboardMutationAccess: vi.fn(),
}))

vi.mock("@/features/clinic-dashboard/auth/server/public", () => ({
  resolveClinicDashboardMutationAccess: accessMocks.resolveClinicDashboardMutationAccess,
}))

import { handleClinicProfileLoad } from "@/features/clinic-dashboard/clinic-profile/server/public"

const providerMocks = {
  discardDraft: vi.fn(),
  loadSnapshot: vi.fn(),
  publishDraft: vi.fn(),
  saveDraft: vi.fn(),
}
const createProvider = vi.fn(
  (_accessToken: string, _clinicId: string) => providerMocks,
) satisfies ClinicProfileProviderFactory

const sourceSnapshot = {
  availableCities: [{ id: "city-istanbul", name: "Istanbul" }],
  published: {
    address: {
      city: { id: "city-istanbul", name: "Istanbul" },
      country: { code: "TR", name: "Türkiye" },
      houseNumber: "12",
      street: "Bağdat Avenue",
      zipCode: "00123",
    },
    descriptionText: "Clinic overview.",
    name: "Clinic One",
    revision: 4,
    supportedLanguages: ["english", "turkish"],
  },
} as const

describe("Clinic profile route actions", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("derives provider scope from authenticated route access, never browser input", async () => {
    accessMocks.resolveClinicDashboardMutationAccess.mockResolvedValue({
      accessToken: "verified-access-token",
      applyToResponse: (response: Response) => response,
      clinicId: "server-derived-clinic",
      status: "approved",
    })
    providerMocks.loadSnapshot.mockResolvedValue({ ok: true, value: sourceSnapshot })

    const response = await handleClinicProfileLoad(
      new NextRequest("http://localhost:3000/api/dashboard/profile?clinicId=other-clinic"),
      createProvider,
    )

    expect(response.status).toBe(200)
    expect(createProvider).toHaveBeenCalledWith("verified-access-token", "server-derived-clinic")
    expect(providerMocks.loadSnapshot).toHaveBeenCalledOnce()
  })
})
