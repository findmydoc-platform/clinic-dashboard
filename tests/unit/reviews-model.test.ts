import { describe, expect, it } from "vitest"
import { serializeReviewsCsv } from "@/features/clinic-dashboard/reviews/model/review-csv"
import {
  defaultReviewFilters,
  filterClinicReviews,
} from "@/features/clinic-dashboard/reviews/model/review-filters"
import { paginateClinicReviews } from "@/features/clinic-dashboard/reviews/model/review-pagination"
import { createReviewsState, reviewsReducer } from "@/features/clinic-dashboard/reviews/model/reviews.reducer"
import {
  selectFilteredReviews,
  selectReviewsViewModel,
} from "@/features/clinic-dashboard/reviews/model/reviews.selectors"
import type { ClinicReview } from "@/features/clinic-dashboard/reviews/public"
import {
  createReviewCommandsFixture,
  reviewsFixture,
} from "@/features/clinic-dashboard/reviews/testing/reviews.fixtures"

const reviews = reviewsFixture.items as readonly ClinicReview[]
const referenceTime = new Date(reviewsFixture.referenceTime)

describe("reviews model", () => {
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

  it("keeps pagination truthful for review pages", () => {
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

  it("keeps related dialog, filter, and mutation transitions in one reducer", () => {
    const openReview = reviews.find((review) => review.status === "Open")
    expect(openReview).toBeDefined()
    if (!openReview) return

    const withDraftFilter = reviewsReducer(createReviewsState(reviews), {
      filters: { ...defaultReviewFilters, status: "Open" },
      type: "draft-filters-changed",
    })
    const withAppliedFilter = reviewsReducer(withDraftFilter, { type: "filters-applied" })
    const withDialog = reviewsReducer(withAppliedFilter, {
      reviewId: openReview.id,
      type: "review-response-opened",
    })
    const answeredReview = {
      ...openReview,
      response: "Thank you for the helpful feedback.",
      status: "Answered" as const,
    }
    const answered = reviewsReducer(withDialog, {
      review: answeredReview,
      statusMessage: "Review response saved.",
      type: "review-mutation-succeeded",
    })

    expect(withAppliedFilter).toMatchObject({
      filters: { status: "Open" },
      isMobileFiltersOpen: false,
      page: 1,
      statusMessage: "Review filters applied.",
    })
    expect(answered.dialog).toEqual({ kind: "response", reviewId: openReview.id })
    expect(answered.reviews.find((review) => review.id === openReview.id)).toEqual(answeredReview)
  })

  it("handles dialog dismissal, mobile filters, pagination, refresh, and status transitions", () => {
    const openReview = reviews.find((review) => review.status === "Open")
    expect(openReview).toBeDefined()
    if (!openReview) return

    const dialogOpen = reviewsReducer(createReviewsState(reviews), {
      reviewId: openReview.id,
      type: "review-appeal-opened",
    })
    const dialogClosed = reviewsReducer(dialogOpen, { type: "review-dialog-closed" })
    const mobileFiltersOpen = reviewsReducer(dialogClosed, {
      isOpen: true,
      type: "mobile-filters-open-changed",
    })
    const secondPage = reviewsReducer(mobileFiltersOpen, { page: 2, type: "page-changed" })
    const refreshStarted = reviewsReducer(secondPage, { type: "refresh-started" })
    const refreshCompleted = reviewsReducer(refreshStarted, {
      statusMessage: "Reviews refreshed.",
      type: "refresh-completed",
    })
    const statusChanged = reviewsReducer(refreshCompleted, {
      statusMessage: "Review CSV exported.",
      type: "status-message-changed",
    })

    expect(dialogClosed.dialog).toEqual({ kind: "closed" })
    expect(mobileFiltersOpen.isMobileFiltersOpen).toBe(true)
    expect(secondPage.page).toBe(2)
    expect(refreshStarted).toMatchObject({ isRefreshing: true, statusMessage: "" })
    expect(refreshCompleted).toMatchObject({ isRefreshing: false, statusMessage: "Reviews refreshed." })
    expect(statusChanged.statusMessage).toBe("Review CSV exported.")
  })

  it("derives the filtered list and complete view model from reducer state", () => {
    const openReview = reviews.find((review) => review.status === "Open")
    expect(openReview).toBeDefined()
    if (!openReview) return

    const withDraftFilters = reviewsReducer(createReviewsState(reviews), {
      filters: { ...defaultReviewFilters, status: "Open" },
      type: "draft-filters-changed",
    })
    const withMobileFilters = reviewsReducer(withDraftFilters, {
      isOpen: true,
      type: "mobile-filters-open-changed",
    })
    const withDialog = reviewsReducer(withMobileFilters, {
      reviewId: openReview.id,
      type: "review-response-opened",
    })
    const viewModel = selectReviewsViewModel(withDialog, reviewsFixture, true)

    expect(selectFilteredReviews(withDialog, reviewsFixture.referenceTime)).toEqual(reviews)
    expect(viewModel).toMatchObject({
      dialog: { kind: "response", review: openReview },
      filters: { isDirty: true, isMobileOpen: true },
      list: {
        filteredCount: reviews.length,
        page: 1,
        pageCount: 2,
        rangeEnd: 3,
        rangeStart: 1,
        totalPublicReviews: reviewsFixture.total,
      },
      showManagement: true,
      summary: {
        rating: reviewsFixture.rating,
        total: reviewsFixture.total,
      },
    })
    expect(viewModel.filters.treatmentOptions).toEqual([
      "Dentistry",
      "Dermatology",
      "Hair transplant",
      "Unknown",
    ])
    expect(viewModel.list.reviews).toEqual(reviews.slice(0, 3))
  })

  it("derives review history as a read-only dialog model", () => {
    const review = reviews[0]
    const withHistoryDialog = reviewsReducer(createReviewsState(reviews), {
      reviewId: review.id,
      type: "review-history-opened",
    })

    expect(selectReviewsViewModel(withHistoryDialog, reviewsFixture, true).dialog).toEqual({
      kind: "history",
      review,
    })
  })

  it("serializes a stable, escaped CSV report", () => {
    const review = {
      ...reviews[0],
      author: 'Clinic "One", Berlin',
      id: "review-1",
    }

    expect(serializeReviewsCsv([review])).toBe(
      '"id","author","rating","treatment","status","createdAt"\n' +
        '"review-1","Clinic ""One"", Berlin","5","Hair transplant","Answered","2023-10-14T09:00:00.000Z"',
    )
  })

  it("maps command mutations onto API-shaped review records", async () => {
    const commands = createReviewCommandsFixture()
    const openReview = reviews.find((review) => review.status === "Open")
    expect(openReview).toBeDefined()
    if (!openReview) return

    const answered = await commands.saveReviewResponse(openReview, "Thank you for the helpful feedback.")
    expect(answered).toMatchObject({
      response: "Thank you for the helpful feedback.",
      status: "Answered",
    })
    expect(answered.revision).toBe(openReview.revision + 1)

    const appealed = await commands.submitReviewAppeal(
      openReview,
      "Incorrect clinic",
      "The visit was elsewhere.",
    )
    expect(appealed.status).toBe("Under review")
    expect(appealed.notice).toContain("Incorrect clinic")
  })
})
