import type { ClinicReview, ReviewStatus } from "./review"

export type ReviewPeriod = "all" | "7" | "30" | "90"
export type ReviewRating = "all" | 1 | 2 | 3 | 4 | 5

export type ReviewFilters = Readonly<{
  period: ReviewPeriod
  rating: ReviewRating
  status: "all" | ReviewStatus
  treatment: "all" | string
}>

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

export function getReviewTreatmentOptions(reviews: readonly ClinicReview[]) {
  return [...new Set(reviews.map((review) => review.treatment))].sort((left, right) =>
    left.localeCompare(right),
  )
}

export function areReviewFiltersEqual(left: ReviewFilters, right: ReviewFilters) {
  return (
    left.period === right.period &&
    left.rating === right.rating &&
    left.status === right.status &&
    left.treatment === right.treatment
  )
}
