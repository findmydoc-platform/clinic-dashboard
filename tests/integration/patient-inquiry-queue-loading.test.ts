import { beforeEach, describe, expect, it, vi } from "vitest"

const serverMocks = vi.hoisted(() => ({
  fetchPatientInquiryQueue: vi.fn(),
  getClinicDashboardAccessToken: vi.fn(),
  loadWorkspace: vi.fn(),
}))

vi.mock("@/lib/env", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/env")>()),
  isControlledAuthTestMode: () => false,
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
  fetchPatientInquiryQueue: serverMocks.fetchPatientInquiryQueue,
  getControlledPatientInquiryQueue: vi.fn(),
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
  })

  it("fails closed when no verified clinic access token is available", async () => {
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue(undefined)

    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
    })
    expect(serverMocks.fetchPatientInquiryQueue).not.toHaveBeenCalled()
  })

  it("fails closed when the Payload queue request is unavailable", async () => {
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue("access-token")
    serverMocks.fetchPatientInquiryQueue.mockRejectedValue(new Error("upstream unavailable"))

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
    serverMocks.fetchPatientInquiryQueue.mockResolvedValue(inquiryQueue)

    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({ inquiryQueue })
    expect(serverMocks.fetchPatientInquiryQueue).toHaveBeenCalledWith("access-token")
  })
})
