import type { ClinicReview } from "./review"

const reviewCsvColumns = ["id", "author", "rating", "treatment", "status", "createdAt"] as const

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

export function serializeReviewsCsv(reviews: readonly ClinicReview[]) {
  const rows = reviews.map((review) => [
    review.id,
    review.author,
    String(review.rating),
    review.treatment,
    review.status,
    review.createdAt,
  ])

  return [reviewCsvColumns, ...rows]
    .map((row) => row.map((value) => escapeCsvCell(value)).join(","))
    .join("\n")
}
