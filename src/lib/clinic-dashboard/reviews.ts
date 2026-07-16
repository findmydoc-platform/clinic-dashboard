export const reviewStatuses = ["Answered", "Open", "Under review"] as const

export type ReviewStatus = (typeof reviewStatuses)[number]
export type ReviewPeriod = "all" | "7" | "30" | "90"
export type ReviewRating = "all" | 1 | 2 | 3 | 4 | 5

export type ClinicReview = {
  age: string
  author: string
  body: string
  createdAt: string
  id: string
  initials: string
  internalNotes: readonly string[]
  notice?: string
  rating: 1 | 2 | 3 | 4 | 5
  response?: string
  revision: number
  status: ReviewStatus
  treatment: string
}

export type ReviewFilters = {
  period: ReviewPeriod
  rating: ReviewRating
  status: "all" | ReviewStatus
  treatment: "all" | string
}

export const defaultReviewFilters: ReviewFilters = {
  period: "all",
  rating: "all",
  status: "all",
  treatment: "all",
}

export function filterClinicReviews(reviews: readonly ClinicReview[], filters: ReviewFilters, now: Date) {
  return reviews.filter((review) => {
    if (filters.rating !== "all" && review.rating !== filters.rating) return false
    if (filters.status !== "all" && review.status !== filters.status) return false
    if (filters.treatment !== "all" && review.treatment !== filters.treatment) return false
    if (filters.period === "all") return true

    const ageInDays = (now.getTime() - new Date(review.createdAt).getTime()) / 86_400_000
    return ageInDays >= 0 && ageInDays <= Number(filters.period)
  })
}

export function paginateClinicReviews(reviews: readonly ClinicReview[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(reviews.length / pageSize))
  const safePage = Math.min(Math.max(page, 1), pageCount)
  const start = (safePage - 1) * pageSize

  return {
    items: reviews.slice(start, start + pageSize),
    page: safePage,
    pageCount,
    rangeEnd: Math.min(start + pageSize, reviews.length),
    rangeStart: reviews.length === 0 ? 0 : start + 1,
  }
}

export function getReviewTreatmentOptions(reviews: readonly ClinicReview[]) {
  return [...new Set(reviews.map((review) => review.treatment))].sort((left, right) =>
    left.localeCompare(right),
  )
}
