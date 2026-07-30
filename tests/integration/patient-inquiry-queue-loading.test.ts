import { beforeEach, describe, expect, it, vi } from "vitest"

const serverMocks = vi.hoisted(() => ({
  composeDataProviders: vi.fn(),
  getClinicDashboardAccess: vi.fn(),
  getClinicDashboardAccessToken: vi.fn(),
  loadDirectory: vi.fn(),
  loadProfile: vi.fn(),
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
  getClinicDashboardAccess: serverMocks.getClinicDashboardAccess,
  getClinicDashboardAccessToken: serverMocks.getClinicDashboardAccessToken,
}))
vi.mock("@/features/clinic-dashboard/messages/server/public", () => ({
  handlePatientInquiryStatusUpdate: vi.fn(),
}))

import { loadClinicDashboardWorkspaceInput } from "@/features/clinic-dashboard/server"

const workspace = {
  account: { initials: "LW", name: "Lukas Weber", role: "Clinic administrator" },
  defaultLocationId: "location-1",
  doctorDirectory: {
    doctors: [],
    medicalSpecialties: [],
    status: "temporarily-unavailable",
  },
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
    serverMocks.getClinicDashboardAccess.mockResolvedValue({
      context: {
        capabilities: ["clinic-profile:view", "clinic-profile:edit"],
        clinic: { id: "clinic-1", name: "Clinic One" },
      },
      status: "approved",
    })
    serverMocks.loadDirectory.mockResolvedValue({
      error: "temporarily-unavailable",
      ok: false,
    })
    serverMocks.loadProfile.mockResolvedValue({
      error: "temporarily-unavailable",
      ok: false,
    })
    serverMocks.composeDataProviders.mockReturnValue({
      doctors: {
        loadDirectory: serverMocks.loadDirectory,
      },
      inquiries: {
        changeStatus: vi.fn(),
        loadQueue: serverMocks.loadQueue,
      },
      profile: {
        loadSnapshot: serverMocks.loadProfile,
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
    expect(serverMocks.composeDataProviders).toHaveBeenCalledWith("access-token", "clinic-1")
    expect(serverMocks.loadQueue).toHaveBeenCalledOnce()
  })

  it("projects the verified doctor directory independently from the inquiry queue", async () => {
    const doctorDirectory = {
      doctors: [
        {
          active: true,
          firstName: "Sarah",
          gender: "female",
          id: "doctor-1",
          languages: ["english"],
          lastName: "Schmidt",
          qualifications: ["MD"],
          specialties: [],
        },
      ],
      medicalSpecialties: [{ id: "specialty-1", name: "Dermatology" }],
      status: "ready",
    } as const
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue("access-token")
    serverMocks.loadDirectory.mockResolvedValue({ ok: true, value: doctorDirectory })
    serverMocks.loadQueue.mockResolvedValue({
      error: "temporarily-unavailable",
      ok: false,
    })

    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({ doctorDirectory })
    expect(serverMocks.composeDataProviders).toHaveBeenCalledWith("access-token", "clinic-1")
    expect(serverMocks.loadDirectory).toHaveBeenCalledOnce()
  })

  it("does not load source-backed profile data without the view capability", async () => {
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue("access-token")
    serverMocks.getClinicDashboardAccess.mockResolvedValue({
      context: {
        capabilities: ["clinic-profile:edit"],
        clinic: { id: "clinic-1", name: "Clinic One" },
      },
      status: "approved",
    })
    serverMocks.loadQueue.mockResolvedValue({
      error: "temporarily-unavailable",
      ok: false,
    })

    const input = await loadClinicDashboardWorkspaceInput()

    expect(input.profileSourceSnapshot).toBeUndefined()
    expect(serverMocks.loadProfile).not.toHaveBeenCalled()
  })
})
