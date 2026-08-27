import { beforeEach, describe, expect, it, vi } from "vitest"
import { clinicProfileSourceFixture } from "@/features/clinic-dashboard/clinic-profile/testing/clinic-profile-source.fixtures"
import { createInquirySnapshot } from "../support/inquiries"

const serverMocks = vi.hoisted(() => ({
  composeDataProviders: vi.fn(),
  getClinicDashboardAccess: vi.fn(),
  getClinicDashboardAccessToken: vi.fn(),
  loadDirectory: vi.fn(),
  loadGallery: vi.fn(),
  loadProfile: vi.fn(),
  loadQueue: vi.fn(),
  loadReviews: vi.fn(),
  loadTreatments: vi.fn(),
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
vi.mock("@/features/clinic-dashboard/clinic-profile/server/clinic-gallery-dto", () => ({
  toDashboardClinicGallerySnapshot: vi.fn((snapshot) => snapshot),
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
  profileProgress: {
    message: "Public profile progress is temporarily unavailable.",
    reason: "profile-unavailable",
    status: "error",
  },
  treatmentSnapshot: { catalogue: [], offerings: [], status: "temporarily-unavailable" },
} as const

const gallerySnapshot = {
  constraints: {
    acceptedMimeTypes: ["image/jpeg"],
    maxConcurrentUploads: 3,
    maxFileBytes: 4_194_304,
    maxItems: 12,
    maxPixels: 50_000_000,
  },
  items: [
    { alt: "Clinic exterior", id: "image-1", status: "published", url: "https://media.example/1.jpg" },
    { alt: "Reception", id: "image-2", status: "published", url: "https://media.example/2.jpg" },
    { alt: "Treatment room", id: "image-3", status: "published", url: "https://media.example/3.jpg" },
  ],
  revision: 2,
} as const

const treatmentSnapshot = {
  catalogue: [],
  offerings: [
    {
      active: true,
      id: "offering-1",
      price: 3_900,
      revision: "revision-1",
      treatment: {
        descriptionText: "A published treatment.",
        id: "treatment-1",
        name: "Published treatment",
      },
    },
  ],
  status: "ready",
} as const

function arrangeReadyProfileProgressSources() {
  serverMocks.loadProfile.mockResolvedValue({ ok: true, value: clinicProfileSourceFixture })
  serverMocks.loadGallery.mockResolvedValue({ ok: true, value: gallerySnapshot })
  serverMocks.loadTreatments.mockResolvedValue({ ok: true, value: treatmentSnapshot })
}

describe("patient inquiry queue server loading", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serverMocks.loadWorkspace.mockResolvedValue(workspace)
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue("verified-token")
    serverMocks.getClinicDashboardAccess.mockResolvedValue({
      context: {
        capabilities: [
          "clinic-gallery:view",
          "clinic-inquiries:view",
          "clinic-profile:view",
          "clinic-profile:edit",
          "clinic-treatments:view",
          "clinic-treatments:edit",
        ],
        clinic: { id: "clinic-1", name: "Clinic One" },
      },
      status: "approved",
    })
    serverMocks.loadDirectory.mockResolvedValue({ error: "temporarily-unavailable", ok: false })
    serverMocks.loadGallery.mockResolvedValue({ error: "unavailable", ok: false })
    serverMocks.loadProfile.mockResolvedValue({ error: "temporarily-unavailable", ok: false })
    serverMocks.loadQueue.mockResolvedValue({ ok: true, value: createInquirySnapshot() })
    serverMocks.loadReviews.mockResolvedValue({ error: "unavailable", ok: false })
    serverMocks.loadTreatments.mockResolvedValue({
      ok: true,
      value: { catalogue: [], offerings: [], status: "ready" },
    })
    serverMocks.composeDataProviders.mockReturnValue({
      doctors: { loadDirectory: serverMocks.loadDirectory },
      gallery: { loadGallery: serverMocks.loadGallery },
      inquiries: { loadQueue: serverMocks.loadQueue },
      profile: { loadSnapshot: serverMocks.loadProfile },
      reviews: { loadReviews: serverMocks.loadReviews },
      treatments: { loadTreatments: serverMocks.loadTreatments },
    })
  })

  it("fails closed without a verified access token", async () => {
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue(undefined)
    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
      profileProgress: {
        reason: "profile-unavailable",
        status: "error",
      },
    })
    expect(serverMocks.composeDataProviders).not.toHaveBeenCalled()
  })

  it("loads only the first open page for an authorized workspace", async () => {
    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({
      inquiryQueue: { changeCursor: "queue-change-1", status: "ready", unreadCount: 1 },
    })
    expect(serverMocks.composeDataProviders).toHaveBeenCalledWith("verified-token", "clinic-1")
    expect(serverMocks.loadQueue).toHaveBeenCalledWith({ lifecycle: "open", unreadOnly: false })
  })

  it("does not load inquiries without the view capability", async () => {
    serverMocks.getClinicDashboardAccess.mockResolvedValue({
      context: { capabilities: [], clinic: { id: "clinic-1", name: "Clinic One" } },
      status: "approved",
    })
    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
    })
    expect(serverMocks.loadQueue).not.toHaveBeenCalled()
  })

  it("evaluates one tenant-bound profile progress snapshot from the three successful source reads", async () => {
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue("access-token")
    serverMocks.loadQueue.mockResolvedValue({ ok: true, value: createInquirySnapshot([]) })
    arrangeReadyProfileProgressSources()

    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({
      profileProgress: {
        completedAreaCount: 6,
        percent: 100,
        status: "ready",
        tasks: [],
        totalAreaCount: 6,
      },
    })
    expect(serverMocks.composeDataProviders).toHaveBeenCalledWith("access-token", "clinic-1")
    expect(serverMocks.loadProfile).toHaveBeenCalledOnce()
    expect(serverMocks.loadGallery).toHaveBeenCalledOnce()
    expect(serverMocks.loadTreatments).toHaveBeenCalledOnce()
  })

  it("keeps profile progress visible without exposing dead tasks to a view-only user", async () => {
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue("access-token")
    serverMocks.getClinicDashboardAccess.mockResolvedValue({
      context: {
        capabilities: ["clinic-gallery:view", "clinic-profile:view", "clinic-treatments:view"],
        clinic: { id: "clinic-1", name: "Clinic One" },
        principal: {
          displayName: "View Only",
          email: "view-only@example.com",
          id: "principal-view-only",
        },
      },
      status: "approved",
    })
    serverMocks.loadQueue.mockResolvedValue({ ok: true, value: createInquirySnapshot([]) })
    serverMocks.loadProfile.mockResolvedValue({
      ok: true,
      value: {
        ...clinicProfileSourceFixture,
        published: { ...clinicProfileSourceFixture.published, name: "" },
      },
    })
    serverMocks.loadGallery.mockResolvedValue({
      ok: true,
      value: { ...gallerySnapshot, items: gallerySnapshot.items.slice(0, 1) },
    })
    serverMocks.loadTreatments.mockResolvedValue({
      ok: true,
      value: { catalogue: [], offerings: [], status: "ready" },
    })

    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({
      profileProgress: {
        completedAreaCount: 3,
        percent: 50,
        status: "ready",
        tasks: [],
      },
    })
  })

  it.each([
    ["clinic-profile:edit", "basic-information"],
    ["clinic-gallery:edit", "clinic-images"],
    ["clinic-treatments:edit", "treatments"],
  ] as const)("includes only the task backed by %s", async (editCapability, expectedTaskId) => {
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue("access-token")
    serverMocks.getClinicDashboardAccess.mockResolvedValue({
      context: {
        capabilities: [
          "clinic-gallery:view",
          "clinic-profile:view",
          "clinic-treatments:view",
          editCapability,
        ],
        clinic: { id: "clinic-1", name: "Clinic One" },
        principal: {
          displayName: "Scoped Editor",
          email: "scoped-editor@example.com",
          id: "principal-scoped-editor",
        },
      },
      status: "approved",
    })
    serverMocks.loadQueue.mockResolvedValue({ ok: true, value: createInquirySnapshot([]) })
    serverMocks.loadProfile.mockResolvedValue({
      ok: true,
      value: {
        ...clinicProfileSourceFixture,
        published: { ...clinicProfileSourceFixture.published, name: "" },
      },
    })
    serverMocks.loadGallery.mockResolvedValue({
      ok: true,
      value: { ...gallerySnapshot, items: gallerySnapshot.items.slice(0, 1) },
    })
    serverMocks.loadTreatments.mockResolvedValue({
      ok: true,
      value: { catalogue: [], offerings: [], status: "ready" },
    })

    const input = await loadClinicDashboardWorkspaceInput()

    expect(input.profileProgress).toMatchObject({
      completedAreaCount: 3,
      percent: 50,
      status: "ready",
    })
    if (input.profileProgress.status !== "ready") throw new Error("Expected ready profile progress")
    expect(input.profileProgress.tasks.map((task) => task.id)).toEqual([expectedTaskId])
  })

  it.each([
    ["profile", "profile-unavailable"],
    ["gallery", "gallery-unavailable"],
    ["treatments", "treatments-unavailable"],
  ] as const)(
    "returns one atomic error without partial progress when the %s source fails",
    async (source, expectedReason) => {
      serverMocks.getClinicDashboardAccessToken.mockResolvedValue("access-token")
      serverMocks.loadQueue.mockResolvedValue({ ok: true, value: createInquirySnapshot([]) })
      arrangeReadyProfileProgressSources()
      const failingRead = {
        gallery: serverMocks.loadGallery,
        profile: serverMocks.loadProfile,
        treatments: serverMocks.loadTreatments,
      }[source]
      failingRead.mockRejectedValue(new Error(`${source} unavailable`))

      const input = await loadClinicDashboardWorkspaceInput()

      expect(input.profileProgress).toEqual({
        message: "Public profile progress is temporarily unavailable.",
        reason: expectedReason,
        status: "error",
      })
      expect(input.profileProgress).not.toHaveProperty("areas")
      expect(input.profileProgress).not.toHaveProperty("tasks")
      expect(input.inquiryQueue).toEqual(createInquirySnapshot([]))
    },
  )

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
    expect(input.profileProgress).toMatchObject({ reason: "profile-unavailable", status: "error" })
    expect(serverMocks.loadProfile).not.toHaveBeenCalled()
  })

  it("marks the gallery unavailable without serializing fixture images when its live read fails", async () => {
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue("access-token")
    serverMocks.getClinicDashboardAccess.mockResolvedValue({
      context: {
        capabilities: ["clinic-gallery:view"],
        clinic: { id: "clinic-1", name: "Clinic One" },
      },
      status: "approved",
    })
    serverMocks.loadQueue.mockResolvedValue({ error: "temporarily-unavailable", ok: false })

    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({
      gallerySnapshot: undefined,
      galleryStatus: "temporarily-unavailable",
    })
    expect(serverMocks.loadGallery).toHaveBeenCalledOnce()
  })

  it("returns one atomic error when gallery access is forbidden", async () => {
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue("access-token")
    serverMocks.getClinicDashboardAccess.mockResolvedValue({
      context: {
        capabilities: ["clinic-profile:view", "clinic-treatments:view"],
        clinic: { id: "clinic-1", name: "Clinic One" },
      },
      status: "approved",
    })
    serverMocks.loadProfile.mockResolvedValue({ ok: true, value: clinicProfileSourceFixture })
    serverMocks.loadTreatments.mockResolvedValue({ ok: true, value: treatmentSnapshot })
    serverMocks.loadQueue.mockResolvedValue({ error: "temporarily-unavailable", ok: false })

    const input = await loadClinicDashboardWorkspaceInput()

    expect(input.profileProgress).toEqual({
      message: "Public profile progress is temporarily unavailable.",
      reason: "gallery-unavailable",
      status: "error",
    })
    expect(serverMocks.loadGallery).not.toHaveBeenCalled()
  })

  it("marks a verified live gallery snapshot ready", async () => {
    const gallerySnapshot = {
      constraints: {
        acceptedMimeTypes: ["image/png"],
        maxConcurrentUploads: 3,
        maxFileBytes: 4_194_304,
        maxItems: 12,
        maxPixels: 50_000_000,
      },
      items: [],
      revision: 2,
    } as const
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue("access-token")
    serverMocks.getClinicDashboardAccess.mockResolvedValue({
      context: {
        capabilities: ["clinic-gallery:view"],
        clinic: { id: "clinic-1", name: "Clinic One" },
      },
      status: "approved",
    })
    serverMocks.loadGallery.mockResolvedValue({ ok: true, value: gallerySnapshot })
    serverMocks.loadQueue.mockResolvedValue({ error: "temporarily-unavailable", ok: false })

    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({
      gallerySnapshot,
      galleryStatus: "ready",
    })
  })

  it("does not load or serialize treatments without the view capability", async () => {
    serverMocks.getClinicDashboardAccessToken.mockResolvedValue("access-token")
    serverMocks.getClinicDashboardAccess.mockResolvedValue({
      context: {
        capabilities: ["clinic-gallery:view", "clinic-profile:view"],
        clinic: { id: "clinic-1", name: "Clinic One" },
      },
      status: "approved",
    })
    serverMocks.loadQueue.mockResolvedValue({
      error: "temporarily-unavailable",
      ok: false,
    })
    serverMocks.loadProfile.mockResolvedValue({ ok: true, value: clinicProfileSourceFixture })
    serverMocks.loadGallery.mockResolvedValue({ ok: true, value: gallerySnapshot })

    await expect(loadClinicDashboardWorkspaceInput()).resolves.toMatchObject({
      profileProgress: { reason: "treatments-unavailable", status: "error" },
      treatmentSnapshot: { catalogue: [], offerings: [], status: "forbidden" },
    })
    expect(serverMocks.loadTreatments).not.toHaveBeenCalled()
  })
})
