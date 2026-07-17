import type { ClinicReview } from "./review"

export type ReviewPagination = Readonly<{
  items: readonly ClinicReview[]
  page: number
  pageCount: number
  rangeEnd: number
  rangeStart: number
}>

export function paginateClinicReviews(
  reviews: readonly ClinicReview[],
  page: number,
  pageSize: number,
): ReviewPagination {
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
