import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type ReviewPaginationProps = Readonly<{
  filteredCount: number
  onPageChange: (page: number) => void
  page: number
  pageCount: number
  rangeEnd: number
  rangeStart: number
  totalPublicReviews: number
}>

export function ReviewPagination({
  filteredCount,
  onPageChange,
  page,
  pageCount,
  rangeEnd,
  rangeStart,
  totalPublicReviews,
}: ReviewPaginationProps) {
  return (
    <nav
      aria-label="Review pages"
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="text-sm text-[var(--foreground)]">
        Showing {rangeStart}–{rangeEnd} of {filteredCount} demo reviews ·{" "}
        {totalPublicReviews.toLocaleString("en-US")} total public reviews
      </span>
      <div className="flex flex-wrap gap-2">
        <Button
          aria-label="Previous review page"
          disabled={page === 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          size="icon"
          variant="ghost"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
          <Button
            aria-current={pageNumber === page ? "page" : undefined}
            aria-label={`Review page ${pageNumber}`}
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            size="icon"
            variant={pageNumber === page ? "primary" : "ghost"}
          >
            {pageNumber}
          </Button>
        ))}
        <Button
          aria-label="Next review page"
          disabled={page === pageCount}
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          size="icon"
          variant="ghost"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
