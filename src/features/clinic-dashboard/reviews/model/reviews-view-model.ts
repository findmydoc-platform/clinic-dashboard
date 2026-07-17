import type { ReviewFilters } from "./review-filters"
import type { ClinicReview } from "./review"
import type {
  ReviewAppealSubmission,
  ReviewDialogModel,
  ReviewNoteSubmission,
  ReviewResponseSubmission,
} from "./review-dialog"
import type { ReviewDistributionEntry } from "./reviews-snapshot"

export type ReviewsViewModel = Readonly<{
  dialog: ReviewDialogModel
  filters: Readonly<{
    draft: ReviewFilters
    isDirty: boolean
    isMobileOpen: boolean
    treatmentOptions: readonly string[]
  }>
  isRefreshing: boolean
  list: Readonly<{
    filteredCount: number
    page: number
    pageCount: number
    rangeEnd: number
    rangeStart: number
    reviews: readonly ClinicReview[]
    totalPublicReviews: number
  }>
  showManagement: boolean
  statusMessage: string
  summary: Readonly<{
    distribution: readonly ReviewDistributionEntry[]
    rating: number
    total: number
  }>
}>

export type ReviewsActions = Readonly<{
  applyFilters: () => void
  changeDraftFilters: (filters: ReviewFilters) => void
  changeMobileFiltersOpen: (open: boolean) => void
  changePage: (page: number) => void
  closeReviewDialog: () => void
  exportReviews: () => void
  markReviewAppealUnderReview: () => Promise<ReviewMutationResult>
  openReviewAppeal: (reviewId: string) => void
  openReviewHistory: (reviewId: string) => void
  openReviewNote: (reviewId: string) => void
  openReviewResponse: (reviewId: string) => void
  refreshReviews: () => void
  submitReviewAppeal: (submission: ReviewAppealSubmission) => Promise<ReviewMutationResult>
  submitReviewNote: (submission: ReviewNoteSubmission) => Promise<ReviewMutationResult>
  submitReviewResponse: (submission: ReviewResponseSubmission) => Promise<ReviewMutationResult>
}>

export type ReviewMutationResult = "applied" | "discarded"
