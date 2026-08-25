import { describe, expect, it } from "vitest"
import {
  createDashboardProfileProgress,
  type DashboardProfileProgressInput,
} from "@/features/clinic-dashboard/dashboard/model/profile-progress"
import type { ClinicProfileCompletenessReady } from "@/features/clinic-dashboard/clinic-profile/public"

const completeProfileAreas = [
  { complete: true, id: "basic-information", missingFields: [] },
  { complete: true, id: "address", missingFields: [] },
  { complete: true, id: "languages", missingFields: [] },
  { complete: true, id: "opening-hours", missingFields: [] },
] as const

const completeInput = {
  gallery: {
    snapshot: {
      constraints: {
        acceptedMimeTypes: ["image/jpeg"],
        maxConcurrentUploads: 3,
        maxFileBytes: 5_000_000,
        maxItems: 20,
        maxPixels: 20_000_000,
      },
      items: [
        { alt: "Exterior", id: "image-1", status: "published", url: "/1.jpg" },
        { alt: "Reception", id: "image-2", status: "published", url: "/2.jpg" },
        { alt: "Treatment room", id: "image-3", status: "published", url: "/3.jpg" },
      ],
      revision: 1,
    },
    status: "ready",
  },
  profile: {
    draft: {
      changedAreas: [],
      completedAreaCount: 4,
      missingAreas: [],
      state: "none",
    },
    published: {
      areas: completeProfileAreas,
      completedAreaCount: 4,
      status: "ready",
    },
  },
  taskActionability: {
    canEditGallery: true,
    canEditProfile: true,
    canEditTreatments: true,
  },
  treatments: {
    catalogue: [],
    offerings: [
      {
        active: true,
        id: "offering-1",
        price: 1_200,
        revision: "1",
        treatment: { descriptionText: "Treatment", id: "treatment-1", name: "Treatment" },
      },
    ],
    status: "ready",
  },
} as const

describe("dashboard public profile progress", () => {
  it("reports all six equally weighted public areas as complete", () => {
    expect(createDashboardProfileProgress(completeInput)).toEqual({
      areas: [
        { complete: true, id: "basic-information", missingItems: [] },
        { complete: true, id: "address", missingItems: [] },
        { complete: true, id: "languages", missingItems: [] },
        { complete: true, id: "opening-hours", missingItems: [] },
        { complete: true, id: "clinic-images", missingItems: [] },
        { complete: true, id: "treatments", missingItems: [] },
      ],
      completedAreaCount: 6,
      percent: 100,
      status: "ready",
      tasks: [],
      totalAreaCount: 6,
    })
  })

  it("rounds the six equal public areas to the specified display values", () => {
    const expectedPercentages = [0, 17, 33, 50, 67, 83, 100] as const

    for (const [completedAreaCount, expectedPercent] of expectedPercentages.entries()) {
      const publishedAreas: ClinicProfileCompletenessReady["areas"] = completeProfileAreas.map(
        (area, index) => ({
          ...area,
          complete: index < Math.min(completedAreaCount, 4),
          missingFields: index < Math.min(completedAreaCount, 4) ? [] : (["name"] as const),
        }),
      )
      const galleryComplete = completedAreaCount >= 5
      const treatmentsComplete = completedAreaCount >= 6
      const result = createDashboardProfileProgress({
        ...completeInput,
        gallery: {
          ...completeInput.gallery,
          snapshot: {
            ...completeInput.gallery.snapshot,
            items: galleryComplete ? completeInput.gallery.snapshot.items : [],
          },
        },
        profile: {
          ...completeInput.profile,
          published: {
            ...completeInput.profile.published,
            areas: publishedAreas,
            completedAreaCount: Math.min(completedAreaCount, 4),
          },
        },
        treatments: {
          ...completeInput.treatments,
          offerings: treatmentsComplete ? completeInput.treatments.offerings : [],
        },
      })

      expect(result).toMatchObject({
        completedAreaCount,
        percent: expectedPercent,
        status: "ready",
      })
    }
  })

  it("ignores draft gallery media until three distinct images are published", () => {
    const result = createDashboardProfileProgress({
      ...completeInput,
      gallery: {
        ...completeInput.gallery,
        snapshot: {
          ...completeInput.gallery.snapshot,
          items: completeInput.gallery.snapshot.items.map((item) => ({
            ...item,
            status: "draft" as const,
          })),
        },
      },
    })

    expect(result.status).toBe("ready")
    if (result.status !== "ready") throw new Error("Expected ready profile progress")

    expect(result).toMatchObject({ completedAreaCount: 5, percent: 83 })
    expect(result.areas.find((area) => area.id === "clinic-images")).toEqual({
      complete: false,
      id: "clinic-images",
      missingItems: ["1 main image", "2 supporting images"],
    })
    expect(result.tasks.map((task) => task.id)).toContain("clinic-images")
    expect(result.tasks.find((task) => task.id === "clinic-images")).toMatchObject({
      destination: "gallery",
      label: "Add clinic images",
    })
  })

  it("creates ordered category tasks with source-derived missing data and bounded benefit copy", () => {
    const result = createDashboardProfileProgress({
      ...completeInput,
      gallery: {
        ...completeInput.gallery,
        snapshot: {
          ...completeInput.gallery.snapshot,
          items: completeInput.gallery.snapshot.items.slice(0, 1),
        },
      },
      profile: {
        draft: completeInput.profile.draft,
        published: {
          areas: [
            {
              complete: false,
              id: "basic-information",
              missingFields: ["name", "descriptionText"],
            },
            {
              complete: false,
              id: "address",
              missingFields: ["address.street", "address.houseNumber", "address.cityId", "address.zipCode"],
            },
            { complete: false, id: "languages", missingFields: ["supportedLanguages"] },
            {
              complete: false,
              id: "opening-hours",
              missingFields: ["openingHours.monday", "openingHours.sunday"],
            },
          ],
          completedAreaCount: 0,
          status: "ready",
        },
      },
      treatments: {
        ...completeInput.treatments,
        offerings: completeInput.treatments.offerings.map((offering) => ({
          ...offering,
          active: false,
        })),
      },
    })

    expect(result.status).toBe("ready")
    if (result.status !== "ready") throw new Error("Expected ready profile progress")

    expect(result.tasks.map((task) => task.id)).toEqual([
      "basic-information",
      "address",
      "languages",
      "opening-hours",
      "clinic-images",
      "treatments",
    ])
    expect(result.tasks[0]).toMatchObject({
      benefit:
        "An accurate clinic name and clear description help patients identify your clinic and understand whether it may fit their needs.",
      completionCriteria: "Publish a valid clinic name and description.",
      destination: "basic-information",
      missingItems: ["Clinic name", "Clinic description"],
    })
    expect(result.tasks[1]).toMatchObject({
      benefit: "A complete address helps patients plan their journey and find your clinic.",
      missingItems: ["Street", "House number", "City", "Postal code"],
    })
    expect(result.tasks[3]).toMatchObject({
      benefit:
        "Current opening hours help patients understand when your clinic is available and whether a visit fits their schedule.",
      missingItems: ["Monday", "Sunday"],
    })
    expect(result.tasks[4]).toMatchObject({
      benefit:
        "Clear, representative images help patients understand what to expect before they contact your clinic.",
      guidance:
        "Choose one clear main image that represents your clinic, then add at least two distinct supporting views. Avoid near-duplicates.",
      missingItems: ["2 supporting images"],
    })
    expect(result.tasks[5]).toMatchObject({
      benefit:
        "Published treatments help patients see what care your clinic offers and whether it may match their needs.",
      missingItems: ["1 active treatment"],
    })

    expect(JSON.stringify(result.tasks)).not.toMatch(
      /priority|qualified inquiries|Airbnb|Booking|first five|study|% effect/i,
    )
  })

  it("replaces four category tasks with one incomplete draft task while retaining gallery and treatment tasks", () => {
    const result = createDashboardProfileProgress({
      ...completeInput,
      gallery: {
        ...completeInput.gallery,
        snapshot: { ...completeInput.gallery.snapshot, items: [] },
      },
      profile: {
        draft: {
          changedAreas: ["basic-information", "languages"],
          completedAreaCount: 2,
          missingAreas: ["address", "opening-hours"],
          state: "incomplete",
        },
        published: {
          areas: completeProfileAreas.map((area) => ({
            ...area,
            complete: false,
            missingFields: ["name"],
          })),
          completedAreaCount: 0,
          status: "ready",
        },
      },
      treatments: { catalogue: [], offerings: [], status: "ready" },
    })

    expect(result.status).toBe("ready")
    if (result.status !== "ready") throw new Error("Expected ready profile progress")

    expect(result.tasks.map((task) => task.id)).toEqual([
      "complete-profile-draft",
      "clinic-images",
      "treatments",
    ])
    expect(result.tasks[0]).toMatchObject({
      completedAreaCount: 2,
      description: "2 areas are ready in your draft. 2 areas still need attention.",
      destination: "address",
      destinationLabel: "Continue editing",
      kind: "complete-draft",
      missingItems: ["Address", "Opening hours"],
      totalAreaCount: 4,
    })
  })

  it("maps publish-ready and conflicted drafts to one executable profile task", () => {
    const publishReady = createDashboardProfileProgress({
      ...completeInput,
      profile: {
        ...completeInput.profile,
        draft: {
          changedAreas: ["basic-information", "opening-hours"],
          completedAreaCount: 4,
          missingAreas: [],
          state: "publish-ready",
        },
      },
    })
    const conflict = createDashboardProfileProgress({
      ...completeInput,
      profile: {
        ...completeInput.profile,
        draft: {
          changedAreas: ["address"],
          completedAreaCount: 4,
          missingAreas: [],
          state: "conflict",
        },
      },
    })

    expect(publishReady).toMatchObject({
      percent: 100,
      status: "ready",
      tasks: [
        {
          changedItems: ["Basic information", "Opening hours"],
          destination: "review-publish",
          destinationLabel: "Review & publish",
          id: "publish-profile-changes",
          kind: "publish-draft",
        },
      ],
    })
    expect(conflict).toMatchObject({
      percent: 100,
      status: "ready",
      tasks: [
        {
          destination: "conflict",
          id: "review-profile-changes",
          kind: "review-draft",
        },
      ],
    })
  })

  it("keeps the percentage but suppresses edit tasks for a fully view-only user", () => {
    const result = createDashboardProfileProgress({
      ...completeInput,
      gallery: {
        ...completeInput.gallery,
        snapshot: { ...completeInput.gallery.snapshot, items: [] },
      },
      profile: {
        ...completeInput.profile,
        published: {
          areas: completeProfileAreas.map((area) => ({
            ...area,
            complete: false,
            missingFields: ["name"],
          })),
          completedAreaCount: 0,
          status: "ready",
        },
      },
      taskActionability: {
        canEditGallery: false,
        canEditProfile: false,
        canEditTreatments: false,
      },
      treatments: { catalogue: [], offerings: [], status: "ready" },
    })

    expect(result).toMatchObject({
      completedAreaCount: 0,
      percent: 0,
      status: "ready",
      tasks: [],
    })
  })

  it("suppresses draft actions when the user can view but cannot edit the profile", () => {
    const result = createDashboardProfileProgress({
      ...completeInput,
      profile: {
        ...completeInput.profile,
        draft: {
          changedAreas: ["basic-information"],
          completedAreaCount: 4,
          missingAreas: [],
          state: "publish-ready",
        },
      },
      taskActionability: {
        canEditGallery: false,
        canEditProfile: false,
        canEditTreatments: false,
      },
    })

    expect(result).toMatchObject({ percent: 100, status: "ready", tasks: [] })
  })

  it("includes only tasks backed by the user's independent edit capabilities", () => {
    const result = createDashboardProfileProgress({
      ...completeInput,
      gallery: {
        ...completeInput.gallery,
        snapshot: { ...completeInput.gallery.snapshot, items: [] },
      },
      profile: {
        ...completeInput.profile,
        published: {
          areas: completeProfileAreas.map((area) => ({
            ...area,
            complete: false,
            missingFields: ["name"],
          })),
          completedAreaCount: 0,
          status: "ready",
        },
      },
      taskActionability: {
        canEditGallery: true,
        canEditProfile: false,
        canEditTreatments: true,
      },
      treatments: { catalogue: [], offerings: [], status: "ready" },
    })

    expect(result.status).toBe("ready")
    if (result.status !== "ready") throw new Error("Expected ready profile progress")
    expect(result.tasks.map((task) => task.id)).toEqual(["clinic-images", "treatments"])
  })

  it("fails atomically when a required source is unavailable or published image IDs collide", () => {
    const cases: readonly Readonly<{
      expectedReason: string
      input: DashboardProfileProgressInput
    }>[] = [
      {
        expectedReason: "profile-unavailable",
        input: { ...completeInput, profile: undefined },
      },
      {
        expectedReason: "profile-contract-error",
        input: {
          ...completeInput,
          profile: {
            ...completeInput.profile,
            published: { reason: "invalid-country-context", status: "system-contract-error" },
          },
        },
      },
      {
        expectedReason: "gallery-unavailable",
        input: { ...completeInput, gallery: { status: "temporarily-unavailable" as const } },
      },
      {
        expectedReason: "treatments-unavailable",
        input: {
          ...completeInput,
          treatments: {
            catalogue: [] as const,
            offerings: [] as const,
            status: "temporarily-unavailable" as const,
          },
        },
      },
      {
        expectedReason: "duplicate-gallery-record",
        input: {
          ...completeInput,
          gallery: {
            ...completeInput.gallery,
            snapshot: {
              ...completeInput.gallery.snapshot,
              items: [
                completeInput.gallery.snapshot.items[0],
                { ...completeInput.gallery.snapshot.items[1], id: "image-1" },
              ],
            },
          },
        },
      },
    ]

    for (const { expectedReason, input } of cases) {
      expect(createDashboardProfileProgress(input)).toEqual({
        message: "Public profile progress is temporarily unavailable.",
        reason: expectedReason,
        status: "error",
      })
    }
  })
})
