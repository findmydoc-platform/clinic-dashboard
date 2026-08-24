import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ReviewPagination({
  onPageChange,
  page,
  pageCount,
  pageSize,
  total,
}: Readonly<{
  onPageChange: (page: number) => void
  page: number
  pageCount: number
  pageSize: number
  total: number
}>) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (value) => value === 1 || value === pageCount || Math.abs(value - page) <= 1,
  )
  return (
    <nav
      aria-label="Review pages"
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="text-sm text-[var(--foreground)]">
        Showing {start}–{end} of {total} reviews
      </span>
      <div className="flex gap-2">
        <Button
          aria-label="Previous review page"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          size="icon"
          variant="ghost"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>
        {pages.map((value) => (
          <Button
            aria-current={value === page ? "page" : undefined}
            aria-label={`Review page ${value}`}
            key={value}
            onClick={() => onPageChange(value)}
            size="icon"
            variant={value === page ? "primary" : "ghost"}
          >
            {value}
          </Button>
        ))}
        <Button
          aria-label="Next review page"
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
          size="icon"
          variant="ghost"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
