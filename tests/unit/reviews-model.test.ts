import { describe, expect, it } from "vitest"
import {
  createPendingReviewResponse,
  projectClinicReviewForPresentation,
} from "@/features/clinic-dashboard/reviews/model/review"
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
    ).toHaveLength(1)
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
    const pendingReview = {
      ...openReview,
      pendingResponse: createPendingReviewResponse(
        "Thank you for the helpful feedback.",
        reviewsFixture.referenceTime,
      ),
    }
    const pending = reviewsReducer(withDialog, {
      review: pendingReview,
      statusMessage: "Demo only — response saved locally; nothing was submitted.",
      type: "review-mutation-succeeded",
    })

    expect(withAppliedFilter).toMatchObject({
      filters: { status: "Open" },
      isMobileFiltersOpen: false,
      page: 1,
      statusMessage: "Review filters applied.",
    })
    expect(pending.dialog).toEqual({ kind: "response", reviewId: openReview.id })
    expect(pending.reviews.find((review) => review.id === openReview.id)).toEqual(pendingReview)
  })

  it("handles dialog dismissal, mobile filters, pagination, and refresh", () => {
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
    expect(dialogClosed.dialog).toEqual({ kind: "closed" })
    expect(mobileFiltersOpen.isMobileFiltersOpen).toBe(true)
    expect(secondPage.page).toBe(2)
    expect(refreshStarted).toMatchObject({ isRefreshing: true, statusMessage: "" })
    expect(refreshCompleted).toMatchObject({ isRefreshing: false, statusMessage: "Reviews refreshed." })
  })

  it("resets filters, pagination, and dialogs for a notification target", () => {
    const targeted = reviewsReducer(
      {
        ...createReviewsState(reviews),
        dialog: { kind: "history", reviewId: reviews[0]?.id ?? "missing-review" },
        draftFilters: { ...defaultReviewFilters, rating: 5 },
        filters: { ...defaultReviewFilters, rating: 5 },
        isMobileFiltersOpen: true,
        page: 2,
      },
      { page: 1, type: "review-targeted" },
    )

    expect(targeted).toMatchObject({
      dialog: { kind: "closed" },
      draftFilters: defaultReviewFilters,
      filters: defaultReviewFilters,
      isMobileFiltersOpen: false,
      page: 1,
      statusMessage: "Review opened from notifications.",
    })
  })

  it("clears management transients on withdrawal while retaining filters and review state", () => {
    const openReview = reviews.find((review) => review.status === "Open")
    expect(openReview).toBeDefined()
    if (!openReview) return

    const retainedFilters = { ...defaultReviewFilters, status: "Open" as const }
    const state = {
      ...createReviewsState(reviews),
      dialog: { kind: "response", reviewId: openReview.id } as const,
      draftFilters: retainedFilters,
      filters: retainedFilters,
      isMobileFiltersOpen: true,
      isRefreshing: true,
      page: 2,
      statusMessage: "Refreshing reviews.",
    }

    const withdrawn = reviewsReducer(state, { type: "management-withdrawn" })

    expect(withdrawn).toMatchObject({
      dialog: { kind: "closed" },
      draftFilters: retainedFilters,
      filters: retainedFilters,
      isMobileFiltersOpen: false,
      isRefreshing: false,
      page: 2,
      reviews: state.reviews,
      statusMessage: "",
    })
    expect(reviewsReducer(withdrawn, { type: "management-withdrawn" })).toBe(withdrawn)
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

  it("projects the canonical snapshot when management is withdrawn", () => {
    const mutatedReview = {
      ...reviews[0],
      pendingResponse: createPendingReviewResponse(
        "Hidden local response pending moderation.",
        reviewsFixture.referenceTime,
      ),
    }
    const staleState = {
      ...createReviewsState(reviews),
      dialog: { kind: "response", reviewId: reviews[0].id } as const,
      draftFilters: { ...defaultReviewFilters, status: "Open" as const },
      filters: { ...defaultReviewFilters, status: "Open" as const },
      isMobileFiltersOpen: true,
      isRefreshing: true,
      page: 2,
      reviews: [mutatedReview, ...reviews.slice(1)],
      statusMessage: "Hidden status",
    }

    const projection = selectReviewsViewModel(staleState, reviewsFixture, false)

    expect(projection).toMatchObject({
      dialog: { kind: "closed" },
      filters: {
        draft: defaultReviewFilters,
        isDirty: false,
        isMobileOpen: false,
      },
      isRefreshing: false,
      list: {
        filteredCount: reviews.length,
        page: 1,
      },
      showManagement: false,
      statusMessage: "",
    })
    expect(projection.list.reviews).toEqual(reviews.slice(0, 3).map(projectClinicReviewForPresentation))
    expect(projection.list.reviews[0]).not.toEqual(mutatedReview)
  })

  it("creates deterministic pending responses without changing publication or review status", async () => {
    const commands = createReviewCommandsFixture()
    const openReview = reviews.find((review) => review.status === "Open")
    const publishedReview = reviews.find((review) => review.status === "Answered")
    expect(openReview).toBeDefined()
    expect(publishedReview).toBeDefined()
    if (!openReview || !publishedReview) return

    const pending = await commands.submitReviewResponseForModeration(
      openReview,
      "  Thank you for the helpful feedback.  ",
    )
    expect(pending).toMatchObject({
      pendingResponse: {
        response: "Thank you for the helpful feedback.",
        status: "pending-moderation",
        submittedAt: reviewsFixture.referenceTime,
      },
      status: "Open",
    })
    expect(pending.publishedResponse).toBeUndefined()
    expect(pending.revision).toBe(openReview.revision + 1)

    const pendingEdit = await commands.submitReviewResponseForModeration(
      publishedReview,
      "Thank you. We have reviewed your feedback again.",
    )
    expect(pendingEdit).toMatchObject({
      pendingResponse: {
        response: "Thank you. We have reviewed your feedback again.",
        status: "pending-moderation",
        submittedAt: reviewsFixture.referenceTime,
      },
      publishedResponse: publishedReview.publishedResponse,
      status: "Answered",
    })
  })

  it("enforces the exact ten-character response boundary", () => {
    expect(() => createPendingReviewResponse("123456789", reviewsFixture.referenceTime)).toThrow(
      "at least 10 characters",
    )
    expect(createPendingReviewResponse("1234567890", reviewsFixture.referenceTime).response).toBe(
      "1234567890",
    )
  })

  it("preserves appeal state when a response command receives an appealed review", async () => {
    const commands = createReviewCommandsFixture()
    const appealedReview = reviews.find((review) => review.status === "Under review")
    expect(appealedReview).toBeDefined()
    if (!appealedReview) return

    const pending = await commands.submitReviewResponseForModeration(
      appealedReview,
      "This response remains subject to moderation.",
    )

    expect(pending).toMatchObject({
      appealCase: appealedReview.appealCase,
      pendingResponse: { status: "pending-moderation" },
      status: "Under review",
    })
  })

  it("maps appeal mutations onto review records", async () => {
    const commands = createReviewCommandsFixture()
    const openReview = reviews.find((review) => review.status === "Open")
    expect(openReview).toBeDefined()
    if (!openReview) return

    const appealed = await commands.submitReviewAppeal(
      openReview,
      "Incorrect clinic",
      "The visit was elsewhere.",
    )
    expect(appealed.status).toBe("Open")
    expect(appealed.appealCase).toMatchObject({
      detail: "The visit was elsewhere.",
      reason: "Incorrect clinic",
      status: "submitted",
    })
    expect(appealed.appealCase?.events).toHaveLength(1)
  })
})
