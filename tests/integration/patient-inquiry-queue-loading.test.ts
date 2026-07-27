import { beforeEach, describe, expect, it, vi } from "vitest"

const serverMocks = vi.hoisted(() => ({
  composeDataProviders: vi.fn(),
  getClinicDashboardAccessToken: vi.fn(),
  loadWorkspace: vi.fn(),
  loadQueue: vi.fn(),
}))

vi.mock("@/features/clinic-dashboard/data-provider-composition", () => ({
  composeClinicDashboardDataProviders: serverMocks.composeDataProviders,
}))
vi.mock("@/features/clinic-dashboard/demo/loader", () => ({
  clinicDashboardDemoWorkspaceProvider: {
    loadWorkspace: serverMocks.loadWorkspace,
  },
}))
vi.mock("@/features/clinic-dashboard/auth/server/public", () => ({
  getClinicDashboardAccess: vi.fn(),
  getClinicDashboardAccessToken: serverMocks.getClinicDashboardAccessToken,
}))
vi.mock("@/features/clinic-dashboard/messages/server/public", () => ({
  handlePatientInquiryStatusUpdate: vi.fn(),
}))

import { loadClinicDashboardWorkspaceInput } from "@/features/clinic-dashboard/server"

const workspace = {
  account: { initials: "LW", name: "Lukas Weber", role: "Clinic administrator" },
  defaultLocationId: "location-1",
  inquiryQueue: { inquiries: [], status: "ready" },
  locationSnapshots: {},
  locations: [],
  notifications: [],
  organization: { id: "clinic-1", name: "Clinic One" },
  treatmentCatalogue: [],
} as const

describe("Patient inquiry queue server loading", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serverMocks.loadWorkspace.mockResolvedValue(workspace)
    serverMocks.composeDataProviders.mockReturnValue({
      inquiries: {
        changeStatus: vi.fn(),
        loadQueue: serverMocks.loadQueue,
      },
    })
  })

  it("fails closed when no verified clinic access token is available", async () => {
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue(undefined)

    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
    })
    expect(serverMocks.composeDataProviders).not.toHaveBeenCalled()
  })

  it("fails closed when the Payload queue request is unavailable", async () => {
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue("access-token")
    serverMocks.loadQueue.mockResolvedValue({
      error: "temporarily-unavailable",
      ok: false,
    })

    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
    })
  })

  it("projects the verified Payload queue into the workspace", async () => {
    const inquiryQueue = {
      inquiries: [
        {
          availableTransitions: ["in_review", "contacted", "closed", "spam"],
          contactWindow: "Afternoon",
          createdAt: "2026-07-26T08:54:00.000Z",
          dateLabel: "26 July 2026",
          email: "l.weber@example.com",
          id: "inquiry-1",
          interest: "Hair transplant",
          message: "I would like to know which documents to prepare.",
          name: "Lukas Weber",
          phone: "+49 000 0000001",
          status: "submitted",
          timeLabel: "10:54",
          treatmentTimeline: "Within one month",
        },
      ],
      status: "ready",
    } as const
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue("access-token")
    serverMocks.loadQueue.mockResolvedValue({ ok: true, value: inquiryQueue })

    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({ inquiryQueue })
    expect(serverMocks.composeDataProviders).toHaveBeenCalledWith("access-token")
    expect(serverMocks.loadQueue).toHaveBeenCalledOnce()
  })
})
