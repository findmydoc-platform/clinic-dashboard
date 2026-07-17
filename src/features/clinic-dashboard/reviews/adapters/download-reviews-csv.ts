import { downloadTextFile } from "@/lib/browser/download-text-file"
import type { ClinicReview } from "../model/review"
import { serializeReviewsCsv } from "../model/review-csv"

const reviewExportFilename = "clinic-reviews-prototype.csv"

export function downloadReviewsCsv(reviews: readonly ClinicReview[]) {
  downloadTextFile({
    content: serializeReviewsCsv(reviews),
    fileName: reviewExportFilename,
    mimeType: "text/csv",
  })
}
