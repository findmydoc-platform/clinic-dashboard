import { areReviewFiltersEqual, filterClinicReviews, getReviewTreatmentOptions } from "./review-filters"
import type { ReviewDialogModel } from "./review-dialog"
import { paginateClinicReviews } from "./review-pagination"
import type { ReviewsData } from "./reviews-data"
import type { ReviewsState } from "./reviews.reducer"
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
  data: ReviewsData,
  showManagement: boolean,
): ReviewsViewModel {
  const filteredReviews = selectFilteredReviews(state, data.referenceTime)
  const pagination = paginateClinicReviews(filteredReviews, state.page, reviewPageSize)

  return {
    dialog: selectReviewDialog(state),
    filters: {
      draft: state.draftFilters,
      isDirty: !areReviewFiltersEqual(state.draftFilters, state.filters),
      isMobileOpen: state.isMobileFiltersOpen,
      treatmentOptions: getReviewTreatmentOptions(state.reviews),
    },
    isRefreshing: state.isRefreshing,
    list: {
      filteredCount: filteredReviews.length,
      page: pagination.page,
      pageCount: pagination.pageCount,
      rangeEnd: pagination.rangeEnd,
      rangeStart: pagination.rangeStart,
      reviews: pagination.items,
      totalPublicReviews: data.total,
    },
    showManagement,
    statusMessage: state.statusMessage,
    summary: {
      distribution: data.distribution,
      rating: data.rating,
      total: data.total,
    },
  }
}
