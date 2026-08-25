import { beforeEach, describe, expect, it, vi } from "vitest"
import { createInquirySnapshot } from "../support/inquiries"

const serverMocks = vi.hoisted(() => ({
  composeDataProviders: vi.fn(),
  getClinicDashboardAccess: vi.fn(),
  getClinicDashboardAccessToken: vi.fn(),
  loadQueue: vi.fn(),
  loadWorkspace: vi.fn(),
}))

vi.mock("@/features/clinic-dashboard/data-provider-composition", () => ({
  composeClinicDashboardDataProviders: serverMocks.composeDataProviders,
}))
vi.mock("@/features/clinic-dashboard/demo/loader", () => ({
  clinicDashboardDemoWorkspaceProvider: { loadWorkspace: serverMocks.loadWorkspace },
}))
vi.mock("@/features/clinic-dashboard/auth/server/public", () => ({
  getClinicDashboardAccess: serverMocks.getClinicDashboardAccess,
  getClinicDashboardAccessToken: serverMocks.getClinicDashboardAccessToken,
  resolveClinicDashboardRouteAccess: vi.fn(),
}))

import { loadClinicDashboardWorkspaceInput } from "@/features/clinic-dashboard/server"

const workspace = {
  account: { initials: "SS", name: "Sarah Schmidt", role: "Clinic administrator" },
  defaultLocationId: "location-1",
  doctorDirectory: { doctors: [], medicalSpecialties: [], status: "temporarily-unavailable" },
  galleryStatus: "temporarily-unavailable",
  inquiryQueue: {
    changeCursor: "fixture",
    inquiries: [],
    status: "ready",
    unchanged: false,
    unreadCount: 0,
  },
  locationSnapshots: {},
  locations: [],
  notifications: [],
  organization: { id: "clinic-1", name: "Clinic One" },
  treatmentSnapshot: { catalogue: [], offerings: [], status: "temporarily-unavailable" },
} as const

describe("patient inquiry queue workspace loading", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serverMocks.loadWorkspace.mockResolvedValue(workspace)
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue("verified-token")
    serverMocks.getClinicDashboardAccess.mockResolvedValue({
      context: {
        capabilities: ["clinic-inquiries:view"],
        clinic: { id: "verified-clinic", name: "Verified Clinic" },
      },
      status: "approved",
    })
    serverMocks.loadQueue.mockResolvedValue({ ok: true, value: createInquirySnapshot() })
    serverMocks.composeDataProviders.mockReturnValue({
      doctors: { loadDirectory: vi.fn(async () => ({ error: "unavailable", ok: false })) },
      gallery: { loadGallery: vi.fn(async () => ({ error: "unavailable", ok: false })) },
      inquiries: { loadQueue: serverMocks.loadQueue },
      profile: { loadSnapshot: vi.fn(async () => ({ error: "unavailable", ok: false })) },
      reviews: { loadReviews: vi.fn(async () => ({ error: "unavailable", ok: false })) },
      treatments: { loadTreatments: vi.fn(async () => ({ error: "unavailable", ok: false })) },
    })
  })

  it("fails closed without a verified access token", async () => {
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue(undefined)
    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
    })
    expect(serverMocks.composeDataProviders).not.toHaveBeenCalled()
  })

  it("loads only the first open page for an authorized workspace", async () => {
    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({
      inquiryQueue: { changeCursor: "queue-change-1", status: "ready", unreadCount: 1 },
    })
    expect(serverMocks.composeDataProviders).toHaveBeenCalledWith("verified-token", "verified-clinic")
    expect(serverMocks.loadQueue).toHaveBeenCalledWith({ lifecycle: "open", unreadOnly: false })
  })

  it("does not load inquiries without the view capability", async () => {
    serverMocks.getClinicDashboardAccess.mockResolvedValue({
      context: { capabilities: [], clinic: { id: "verified-clinic", name: "Verified Clinic" } },
      status: "approved",
    })
    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
    })
    expect(serverMocks.loadQueue).not.toHaveBeenCalled()
  })
})
