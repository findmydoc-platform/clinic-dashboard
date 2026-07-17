import { areReviewFiltersEqual, filterClinicReviews, getReviewTreatmentOptions } from "./review-filters"
import type { ReviewDialogModel } from "./review-dialog"
import { paginateClinicReviews } from "./review-pagination"
import { projectClinicReviewForPresentation } from "./review"
import type { ReviewsSnapshot } from "./reviews-snapshot"
import { createReviewsState, type ReviewsState } from "./reviews.reducer"
import type { ReviewsViewModel } from "./reviews-view-model"

const reviewPageSize = 3

function selectReviewDialog(state: ReviewsState): ReviewDialogModel {
  if (state.dialog.kind === "closed") return state.dialog

  const reviewId = state.dialog.reviewId
  const review = state.reviews.find(({ id }) => id === reviewId)
  if (!review) return { kind: "closed" }

  switch (state.dialog.kind) {
    case "appeal":
      return { kind: "appeal", review }
    case "history":
      return { kind: "history", review }
    case "note":
      return { kind: "note", review }
    case "response":
      return { kind: "response", review }
  }
}

export function selectFilteredReviews(state: ReviewsState, referenceTime: string) {
  return filterClinicReviews(state.reviews, state.filters, new Date(referenceTime))
}

export function selectReviewsViewModel(
  state: ReviewsState,
  snapshot: ReviewsSnapshot,
  showManagement: boolean,
): ReviewsViewModel {
  const projectedState = showManagement
    ? state
    : createReviewsState(snapshot.items.map(projectClinicReviewForPresentation))
  const filteredReviews = selectFilteredReviews(projectedState, snapshot.referenceTime)
  const pagination = paginateClinicReviews(filteredReviews, projectedState.page, reviewPageSize)

  return {
    dialog: selectReviewDialog(projectedState),
    filters: {
      draft: projectedState.draftFilters,
      isDirty: !areReviewFiltersEqual(projectedState.draftFilters, projectedState.filters),
      isMobileOpen: projectedState.isMobileFiltersOpen,
      treatmentOptions: getReviewTreatmentOptions(projectedState.reviews),
    },
    isRefreshing: projectedState.isRefreshing,
    list: {
      filteredCount: filteredReviews.length,
      page: pagination.page,
      pageCount: pagination.pageCount,
      rangeEnd: pagination.rangeEnd,
      rangeStart: pagination.rangeStart,
      reviews: pagination.items,
      totalPublicReviews: snapshot.total,
    },
    showManagement,
    statusMessage: projectedState.statusMessage,
    summary: {
      distribution: snapshot.distribution,
      rating: snapshot.rating,
      total: snapshot.total,
    },
  }
}
