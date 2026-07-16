import { describe, expect, it } from "vitest"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import {
  cloneClinicProfile,
  createClinicProfileEntityId,
  isClinicProfileDirty,
  type ClinicProfileDraft,
} from "@/lib/clinic-dashboard/profile"
import {
  createFixtureClinicDashboardDataSource,
  fixtureClinicDashboardDataSource,
} from "@/lib/clinic-dashboard/prototype-data-source"
import {
  defaultReviewFilters,
  filterClinicReviews,
  paginateClinicReviews,
  type ClinicReview,
} from "@/lib/clinic-dashboard/reviews"
import { validateSupportRequest } from "@/lib/clinic-dashboard/support"

const reviews = clinicDashboardFixture.reviews.items as readonly ClinicReview[]
const referenceTime = new Date(clinicDashboardFixture.reviews.referenceTime)

describe("reviews prototype contract", () => {
  it("filters reviews by period, rating, treatment, and status", () => {
    expect(
      filterClinicReviews(reviews, { ...defaultReviewFilters, period: "7" }, referenceTime),
    ).toHaveLength(2)
    expect(filterClinicReviews(reviews, { ...defaultReviewFilters, rating: 5 }, referenceTime)).toHaveLength(
      2,
    )
    expect(
      filterClinicReviews(reviews, { ...defaultReviewFilters, status: "Under review" }, referenceTime),
    ).toHaveLength(2)
    expect(
      filterClinicReviews(reviews, { ...defaultReviewFilters, treatment: "Dermatology" }, referenceTime),
    ).toHaveLength(1)
  })

  it("includes the period boundary and excludes future reviews", () => {
    const boundary = { ...reviews[0], createdAt: "2023-10-09T12:00:00.000Z", id: "boundary" }
    const future = { ...reviews[0], createdAt: "2023-10-17T12:00:00.000Z", id: "future" }
    expect(
      filterClinicReviews([boundary, future], { ...defaultReviewFilters, period: "7" }, referenceTime),
    ).toEqual([boundary])
  })

  it("keeps pagination truthful for fixture review pages", () => {
    expect(paginateClinicReviews(reviews, 1, 3)).toMatchObject({
      page: 1,
      pageCount: 2,
      rangeEnd: 3,
      rangeStart: 1,
    })
    expect(paginateClinicReviews(reviews, 2, 3)).toMatchObject({
      page: 2,
      pageCount: 2,
      rangeEnd: 6,
      rangeStart: 4,
    })
    expect(paginateClinicReviews(reviews, 99, 3)).toMatchObject({ page: 2, rangeStart: 4 })
    expect(paginateClinicReviews([], 4, 3)).toMatchObject({
      items: [],
      page: 1,
      pageCount: 1,
      rangeEnd: 0,
      rangeStart: 0,
    })
  })

  it("maps fixture mutations onto future API-shaped review records", async () => {
    const dataSource = fixtureClinicDashboardDataSource
    const openReview = reviews.find((review) => review.status === "Open")
    expect(openReview).toBeDefined()
    if (!openReview) return

    const answered = await dataSource.saveReviewResponse(openReview, "Thank you for the helpful feedback.")
    expect(answered).toMatchObject({ response: "Thank you for the helpful feedback.", status: "Answered" })
    expect(answered.revision).toBe(openReview.revision + 1)

    const appealed = await dataSource.submitReviewAppeal(
      openReview,
      "Incorrect clinic",
      "The visit was elsewhere.",
    )
    expect(appealed.status).toBe("Under review")
    expect(appealed.notice).toContain("Incorrect clinic")
  })
})

describe("clinic profile prototype contract", () => {
  it("clones nested profile data and detects draft changes", () => {
    const saved = cloneClinicProfile(clinicDashboardFixture.profile as ClinicProfileDraft)
    const draft = cloneClinicProfile(saved)
    expect(isClinicProfileDirty(saved, draft)).toBe(false)

    draft.address.city = "Hamburg"
    expect(isClinicProfileDirty(saved, draft)).toBe(true)
    expect(saved.address.city).toBe("Berlin")
  })

  it("increments the revision when the fixture profile is saved", async () => {
    const dataSource = fixtureClinicDashboardDataSource
    const profile = cloneClinicProfile(clinicDashboardFixture.profile as ClinicProfileDraft)
    const saved = await dataSource.saveClinicProfile({ ...profile, name: "Updated prototype clinic" })

    expect(saved.name).toBe("Updated prototype clinic")
    expect(saved.revision).toBe(profile.revision + 1)
  })

  it("creates collision-safe IDs for duplicate display names", () => {
    expect(createClinicProfileEntityId("team")).not.toBe(createClinicProfileEntityId("team"))
    expect(createClinicProfileEntityId("treatment")).toMatch(/^treatment-[\da-f-]+$/)
  })
})

describe("support prototype contract", () => {
  it("validates required fields and screenshot metadata", () => {
    expect(
      validateSupportRequest({
        category: "",
        message: "short",
        preferredReplyChannel: "Email",
        screenshot: { name: "notes.pdf", size: 6 * 1024 * 1024, type: "application/pdf" },
        subject: "Help",
      }),
    ).toEqual({
      category: "Choose a support category.",
      message: "Describe the issue using at least 20 characters.",
      screenshot: "Choose an image file.",
      subject: "Enter a subject with at least 5 characters.",
    })
  })

  it("returns a fixture receipt without production persistence", async () => {
    const receipt = await createFixtureClinicDashboardDataSource(0).submitSupportRequest({
      category: "Technical issue",
      message: "The review page does not refresh after I submit a response.",
      preferredReplyChannel: "Email",
      subject: "Review refresh issue",
    })
    expect(receipt).toEqual({ expectedResponse: "within one business day", ticketId: "FMD-1042" })
  })
})
