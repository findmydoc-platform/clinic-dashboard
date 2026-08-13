export const reviewPublicMeasures = ["none", "context", "redaction", "placeholder", "removed"] as const
export const reviewWithdrawalStates = ["active", "withdrawn"] as const
export const reviewResponseStatuses = ["pending", "approved", "rejected", "blocked"] as const
export const reviewAppealStatuses = ["submitted", "under_review", "upheld", "dismissed"] as const
export const reviewAppealReasons = [
  "incorrect_clinic",
  "inappropriate_content",
  "privacy_concern",
  "other",
] as const
export const reviewVisibilityFilters = ["all", "published", "moderated", "removed", "withdrawn"] as const
export const reviewPeriodFilters = ["all", "7", "30", "90"] as const
export const reviewRatingFilters = ["all", "1", "2", "3", "4", "5"] as const

export type ReviewPublicMeasure = (typeof reviewPublicMeasures)[number]
export type ReviewWithdrawalState = (typeof reviewWithdrawalStates)[number]
export type ReviewResponseStatus = (typeof reviewResponseStatuses)[number]
export type ReviewAppealStatus = (typeof reviewAppealStatuses)[number]
export type ReviewAppealReason = (typeof reviewAppealReasons)[number]
export type ReviewVisibilityFilter = (typeof reviewVisibilityFilters)[number]
export type ReviewPeriodFilter = (typeof reviewPeriodFilters)[number]
export type ReviewRatingFilter = (typeof reviewRatingFilters)[number]

export type ReviewTreatmentOption = Readonly<{
  id: string
  label: string
}>

export type ReviewResponseWorkflow = Readonly<{
  id: string
  moderatedAt?: string
  pending?: Readonly<{
    body: string
    submittedAt: string
  }>
  published?: Readonly<{
    approvedAt: string
    body: string
  }>
  status: ReviewResponseStatus
}>

export type ReviewAppealWorkflow = Readonly<{
  createdAt: string
  decidedAt?: string
  decisionReason?: string
  details: string
  id: string
  reason: ReviewAppealReason
  status: ReviewAppealStatus
}>

export type ClinicReviewRecord = Readonly<{
  appeal?: ReviewAppealWorkflow
  author: string
  id: string
  initials: string
  publicMeasure: ReviewPublicMeasure
  publicNotice?: string
  publicText?: string
  rating: 1 | 2 | 3 | 4 | 5
  response?: ReviewResponseWorkflow
  reviewDate: string
  treatment: ReviewTreatmentOption
  withdrawalState: ReviewWithdrawalState
  withdrawnAt?: string
}>

export type ReviewDistributionEntry = Readonly<{
  count: number
  percent: number
  stars: 1 | 2 | 3 | 4 | 5
}>

export type ReviewsSourceSnapshot = Readonly<{
  page: Readonly<{
    items: readonly ClinicReviewRecord[]
    limit: number
    page: number
    pageCount: number
    total: number
  }>
  referenceTime: string
  summary: Readonly<{
    distribution: readonly ReviewDistributionEntry[]
    rating: number
    total: number
  }>
  treatments: readonly ReviewTreatmentOption[]
}>

export type ReviewListFilters = Readonly<{
  period: ReviewPeriodFilter
  rating: ReviewRatingFilter
  treatment: "all" | string
  visibility: ReviewVisibilityFilter
}>

export const defaultReviewListFilters: ReviewListFilters = {
  period: "all",
  rating: "all",
  treatment: "all",
  visibility: "all",
}

export type ReviewPublicationHistoryEntry = Readonly<{
  actorType: "patient" | "platform_staff" | "system"
  id: string
  publicAuthorName?: string
  publicMeasure: ReviewPublicMeasure
  publicNotice?: string
  publicText?: string
  recordedAt: string
  reviewDate: string
  starRating: 1 | 2 | 3 | 4 | 5
  status: "approved" | "pending" | "rejected"
  withdrawalSource?: "patient" | "platform"
  withdrawalState: ReviewWithdrawalState
  withdrawnAt?: string
}>

export type ReviewResponseHistoryEntry = Readonly<{
  action:
    "approved" | "blocked" | "pending_edited" | "rejected" | "revision_submitted" | "seeded" | "submitted"
  actorType: "clinic_staff" | "platform_staff" | "system"
  id: string
  pendingBody?: string
  publishedBody?: string
  recordedAt: string
  status: ReviewResponseStatus
}>

export function canSubmitReviewResponse(review: ClinicReviewRecord) {
  return !review.response || (review.response.status === "pending" && Boolean(review.response.pending))
}

export type ReviewAppealHistoryEntry = Readonly<{
  action: "dismissed" | "reviewed" | "seeded" | "submitted" | "under_review" | "upheld"
  actorType: "clinic_staff" | "platform_staff" | "system"
  decidedAt?: string
  decisionReason?: string
  id: string
  recordedAt: string
  status: ReviewAppealStatus
}>

export type ReviewHistorySnapshot = Readonly<{
  appeal: readonly ReviewAppealHistoryEntry[]
  publication: Readonly<{
    entries: readonly ReviewPublicationHistoryEntry[]
    hasNextPage: boolean
    nextCursor?: string
  }>
  response: readonly ReviewResponseHistoryEntry[]
  reviewId: string
}>

export function reviewAppealReasonLabel(reason: ReviewAppealReason) {
  const labels = {
    incorrect_clinic: "Incorrect clinic",
    inappropriate_content: "Inappropriate content",
    other: "Other",
    privacy_concern: "Privacy concern",
  } as const
  return labels[reason]
}

export function reviewAppealStatusLabel(status: ReviewAppealStatus) {
  const labels = {
    dismissed: "Dismissed",
    submitted: "Submitted",
    under_review: "Under review",
    upheld: "Upheld",
  } as const
  return labels[status]
}

export function reviewResponseStatusLabel(status: ReviewResponseStatus) {
  const labels = {
    approved: "Approved",
    blocked: "Blocked",
    pending: "Pending moderation",
    rejected: "Rejected",
  } as const
  return labels[status]
}

export function reviewPublicMeasureLabel(measure: ReviewPublicMeasure) {
  const labels = {
    context: "Context added",
    none: "No public change",
    placeholder: "Neutral placeholder",
    redaction: "Text redacted",
    removed: "Review removed",
  } as const
  return labels[measure]
}
