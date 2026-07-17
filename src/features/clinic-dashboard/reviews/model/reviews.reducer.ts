import { defaultReviewFilters, type ReviewFilters } from "./review-filters"
import type { ClinicReview } from "./review"
import type { ReviewDialogSelection } from "./review-dialog"

export type ReviewsState = Readonly<{
  dialog: ReviewDialogSelection
  draftFilters: ReviewFilters
  filters: ReviewFilters
  isMobileFiltersOpen: boolean
  isRefreshing: boolean
  page: number
  reviews: readonly ClinicReview[]
  statusMessage: string
}>

export type ReviewsAction =
  | Readonly<{ filters: ReviewFilters; type: "draft-filters-changed" }>
  | Readonly<{ isOpen: boolean; type: "mobile-filters-open-changed" }>
  | Readonly<{ page: number; type: "page-changed" }>
  | Readonly<{ reviewId: string; type: "review-appeal-opened" }>
  | Readonly<{ reviewId: string; type: "review-history-opened" }>
  | Readonly<{ reviewId: string; type: "review-note-opened" }>
  | Readonly<{ reviewId: string; type: "review-response-opened" }>
  | Readonly<{ review: ClinicReview; statusMessage: string; type: "review-mutation-succeeded" }>
  | Readonly<{ statusMessage: string; type: "refresh-completed" }>
  | Readonly<{ statusMessage: string; type: "status-message-changed" }>
  | Readonly<{ type: "filters-applied" }>
  | Readonly<{ type: "review-dialog-closed" }>
  | Readonly<{ type: "refresh-started" }>

export function createReviewsState(reviews: readonly ClinicReview[]): ReviewsState {
  return {
    dialog: { kind: "closed" },
    draftFilters: defaultReviewFilters,
    filters: defaultReviewFilters,
    isMobileFiltersOpen: false,
    isRefreshing: false,
    page: 1,
    reviews: reviews.map((review) => ({ ...review, internalNotes: [...review.internalNotes] })),
    statusMessage: "",
  }
}

export function reviewsReducer(state: ReviewsState, action: ReviewsAction): ReviewsState {
  switch (action.type) {
    case "draft-filters-changed":
      return { ...state, draftFilters: action.filters }
    case "filters-applied":
      return {
        ...state,
        filters: state.draftFilters,
        isMobileFiltersOpen: false,
        page: 1,
        statusMessage: "Review filters applied.",
      }
    case "mobile-filters-open-changed":
      return { ...state, isMobileFiltersOpen: action.isOpen }
    case "page-changed":
      return { ...state, page: action.page }
    case "refresh-completed":
      return { ...state, isRefreshing: false, statusMessage: action.statusMessage }
    case "refresh-started":
      return { ...state, isRefreshing: true, statusMessage: "" }
    case "review-appeal-opened":
      return {
        ...state,
        dialog: { kind: "appeal", reviewId: action.reviewId },
      }
    case "review-dialog-closed":
      return { ...state, dialog: { kind: "closed" } }
    case "review-history-opened":
      return { ...state, dialog: { kind: "history", reviewId: action.reviewId } }
    case "review-note-opened":
      return { ...state, dialog: { kind: "note", reviewId: action.reviewId } }
    case "review-response-opened":
      return { ...state, dialog: { kind: "response", reviewId: action.reviewId } }
    case "review-mutation-succeeded":
      return {
        ...state,
        reviews: state.reviews.map((review) => (review.id === action.review.id ? action.review : review)),
        statusMessage: action.statusMessage,
      }
    case "status-message-changed":
      return { ...state, statusMessage: action.statusMessage }
  }
}
