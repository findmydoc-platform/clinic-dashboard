import type {
  ClinicReviewRecord,
  ReviewAppealReason,
  ReviewHistorySnapshot,
  ReviewListFilters,
  ReviewsSourceSnapshot,
} from "./review-source"

export type ReviewDialogModel =
  | Readonly<{ kind: "closed" }>
  | Readonly<{ kind: "appeal"; review: ClinicReviewRecord }>
  | Readonly<{ kind: "response"; review: ClinicReviewRecord }>
  | Readonly<{
      error?: string
      history?: ReviewHistorySnapshot
      isLoading: boolean
      isLoadingOlder: boolean
      kind: "history"
      review: ClinicReviewRecord
    }>

export type ReviewsViewModel = Readonly<{
  dialog: ReviewDialogModel
  filters: Readonly<{
    draft: ReviewListFilters
    isDirty: boolean
    isMobileOpen: boolean
    treatmentOptions: ReviewsSourceSnapshot["treatments"]
  }>
  isLoading: boolean
  list?: ReviewsSourceSnapshot["page"]
  showManagement: boolean
  statusMessage: string
  summary?: ReviewsSourceSnapshot["summary"]
}>

export type ReviewMutationResult = "applied" | "discarded"

export type ReviewsActions = Readonly<{
  applyFilters: () => void
  changeDraftFilters: (filters: ReviewListFilters) => void
  changeMobileFiltersOpen: (open: boolean) => void
  changePage: (page: number) => void
  closeReviewDialog: () => void
  loadOlderHistory: () => void
  openReviewAppeal: (reviewId: string) => void
  openReviewHistory: (reviewId: string) => void
  openReviewResponse: (reviewId: string) => void
  refreshReviews: () => void
  submitReviewAppeal: (submission: {
    details: string
    reason: ReviewAppealReason
  }) => Promise<ReviewMutationResult>
  submitReviewResponse: (body: string) => Promise<ReviewMutationResult>
}>
