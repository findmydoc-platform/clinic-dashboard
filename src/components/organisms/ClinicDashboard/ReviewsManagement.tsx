"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileClock,
  Flag,
  Info,
  MessageSquareReply,
  Pencil,
  RefreshCw,
  SlidersHorizontal,
  StickyNote,
} from "lucide-react"
import { AvatarInitials, RatingStars, WorkspaceHeading } from "@/components/atoms/DashboardPrimitives"
import { RatingSummary, SurfaceCard } from "@/components/molecules/DashboardCards"
import { ReviewActionDialog, type ReviewActionMode } from "@/components/molecules/ReviewActionDialog"
import { Button } from "@/components/ui/button"
import {
  defaultReviewFilters,
  filterClinicReviews,
  getReviewTreatmentOptions,
  paginateClinicReviews,
  reviewStatuses,
  type ClinicReview,
  type ReviewFilters,
  type ReviewPeriod,
  type ReviewRating,
} from "@/lib/clinic-dashboard/reviews"
import {
  fixtureClinicDashboardDataSource,
  type ClinicDashboardDataSource,
} from "@/lib/clinic-dashboard/prototype-data-source"
import { isGateVisible, type ClinicDashboardVariant } from "@/lib/clinic-dashboard/visibility"
import { cn } from "@/lib/utils"

const pageSize = 3

export type ReviewsManagementData = {
  distribution: readonly { count: number; percent: number; stars: number }[]
  items: readonly ClinicReview[]
  rating: number
  referenceTime: string
  total: number
}

export function ReviewsManagement({
  dataSource = fixtureClinicDashboardDataSource,
  data,
  focusHeading = false,
  onFocusHandled,
  onReviewChange,
  variant,
}: {
  dataSource?: ClinicDashboardDataSource
  data: ReviewsManagementData
  focusHeading?: boolean
  onFocusHandled?: () => void
  onReviewChange: (review: ClinicReview) => void
  variant: ClinicDashboardVariant
}) {
  const showManagement = isGateVisible(variant, "reviewManagement")
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [draftFilters, setDraftFilters] = useState<ReviewFilters>(defaultReviewFilters)
  const [filters, setFilters] = useState<ReviewFilters>(defaultReviewFilters)
  const [page, setPage] = useState(1)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<ReviewActionMode>("response")
  const [selectedReviewId, setSelectedReviewId] = useState<string>()

  useEffect(() => {
    if (!focusHeading) return

    const frame = requestAnimationFrame(() => {
      headingRef.current?.focus()
      onFocusHandled?.()
    })

    return () => cancelAnimationFrame(frame)
  }, [focusHeading, onFocusHandled])

  const reviews = data.items
  const filteredReviews = useMemo(
    () => filterClinicReviews(reviews, filters, new Date(data.referenceTime)),
    [data.referenceTime, filters, reviews],
  )
  const pagination = useMemo(
    () => paginateClinicReviews(filteredReviews, page, pageSize),
    [filteredReviews, page],
  )
  const selectedReview = reviews.find((review) => review.id === selectedReviewId)
  const treatmentOptions = getReviewTreatmentOptions(reviews)
  const filtersDirty =
    draftFilters.period !== filters.period ||
    draftFilters.rating !== filters.rating ||
    draftFilters.status !== filters.status ||
    draftFilters.treatment !== filters.treatment

  const openReviewAction = (review: ClinicReview, mode: ReviewActionMode) => {
    setSelectedReviewId(review.id)
    setDialogMode(mode)
    setDialogOpen(true)
  }

  const handleDialogSubmit = async ({ detail, reason }: { detail: string; reason: string }) => {
    if (!selectedReview) return

    const nextReview =
      dialogMode === "response"
        ? await dataSource.saveReviewResponse(selectedReview, detail)
        : dialogMode === "appeal"
          ? await dataSource.submitReviewAppeal(selectedReview, reason, detail)
          : await dataSource.saveReviewNote(selectedReview, detail)

    onReviewChange(nextReview)
    setStatusMessage(
      dialogMode === "response"
        ? "Review response saved."
        : dialogMode === "appeal"
          ? "Appeal submitted for moderation."
          : "Internal note saved.",
    )
  }

  const applyFilters = () => {
    setFilters(draftFilters)
    setPage(1)
    setStatusMessage("Review filters applied.")
    setMobileFiltersOpen(false)
  }

  const refreshReviews = () => {
    setRefreshing(true)
    setStatusMessage("")
    window.setTimeout(() => {
      setRefreshing(false)
      setStatusMessage("Reviews refreshed from the fixture data source.")
    }, 320)
  }

  const exportReviews = () => {
    const header = ["id", "author", "rating", "treatment", "status", "createdAt"]
    const rows = filteredReviews.map((review) => [
      review.id,
      review.author,
      String(review.rating),
      review.treatment,
      review.status,
      review.createdAt,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
      .join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "clinic-reviews-prototype.csv"
    link.click()
    URL.revokeObjectURL(url)
    setStatusMessage("Fixture review CSV exported.")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <WorkspaceHeading
          description="Manage patient feedback and respond to reviews."
          ref={headingRef}
          tabIndex={-1}
        >
          Reviews
        </WorkspaceHeading>
        {showManagement ? (
          <Button onClick={exportReviews} variant="outline">
            <Download aria-hidden="true" className="size-4" /> Export
          </Button>
        ) : null}
      </div>

      <section aria-label="Review summary" className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <SurfaceCard>
          <RatingSummary count={data.total} value={data.rating} />
        </SurfaceCard>
        <SurfaceCard className="p-6">
          <h2 className="text-xl font-bold text-[var(--secondary)]">Rating distribution</h2>
          <dl className="mt-5 space-y-3">
            {data.distribution.map((entry) => (
              <div className="grid grid-cols-[2rem_1fr_4rem] items-center gap-3" key={entry.stars}>
                <dt className="text-sm font-bold">{entry.stars} ★</dt>
                <dd>
                  <div
                    aria-label={`${entry.stars} stars: ${entry.percent}%`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={entry.percent}
                    className="h-2 overflow-hidden rounded-full bg-[var(--surface)]"
                    role="progressbar"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--primary)]"
                      style={{ width: `${entry.percent}%` }}
                    />
                  </div>
                </dd>
                <dd className="text-right text-sm text-[var(--foreground)]">
                  {entry.count.toLocaleString("en-US")}
                </dd>
              </div>
            ))}
          </dl>
        </SurfaceCard>
      </section>

      {showManagement ? (
        <section aria-label="Review filters">
          <Button
            aria-expanded={mobileFiltersOpen}
            className="w-full sm:hidden"
            onClick={() => setMobileFiltersOpen((current) => !current)}
            variant="outline"
          >
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            {mobileFiltersOpen ? "Hide filters" : "Show filters"}
          </Button>
          <SurfaceCard
            className={cn(
              "mt-3 gap-3 p-4 sm:mt-0 sm:grid sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]",
              mobileFiltersOpen ? "grid" : "hidden",
            )}
          >
            <label className="grid gap-1 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
              Period
              <select
                className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal"
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, period: event.target.value as ReviewPeriod }))
                }
                value={draftFilters.period}
              >
                <option value="all">All periods</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
              Rating
              <select
                className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal"
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    rating:
                      event.target.value === "all" ? "all" : (Number(event.target.value) as ReviewRating),
                  }))
                }
                value={draftFilters.rating}
              >
                <option value="all">All ratings</option>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} {rating === 1 ? "star" : "stars"}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
              Treatment
              <select
                className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal"
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, treatment: event.target.value }))
                }
                value={draftFilters.treatment}
              >
                <option value="all">All treatments</option>
                {treatmentOptions.map((treatment) => (
                  <option key={treatment} value={treatment}>
                    {treatment}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
              Status
              <select
                className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal"
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    status: event.target.value as ReviewFilters["status"],
                  }))
                }
                value={draftFilters.status}
              >
                <option value="all">All statuses</option>
                {reviewStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col justify-end gap-1.5">
              <span className="text-xs font-bold text-[var(--foreground)]">
                {filtersDirty ? "Changes not applied" : "Filters up to date"}
              </span>
              <div className="flex gap-2">
                <Button
                  disabled={!filtersDirty}
                  onClick={applyFilters}
                  size="small"
                  variant={filtersDirty ? "primary" : "outline"}
                >
                  <SlidersHorizontal aria-hidden="true" className="size-4" /> Apply filters
                </Button>
                <Button
                  aria-label={refreshing ? "Refreshing reviews" : "Refresh reviews"}
                  disabled={refreshing}
                  onClick={refreshReviews}
                  size="small"
                  variant="outline"
                >
                  <RefreshCw aria-hidden="true" className={cn("size-4", refreshing && "animate-spin")} />
                  {refreshing ? "Refreshing…" : "Refresh"}
                </Button>
              </div>
            </div>
          </SurfaceCard>
        </section>
      ) : null}

      <p aria-live="polite" className="min-h-5 text-sm text-[var(--foreground)]" role="status">
        {statusMessage}
      </p>

      <section aria-label="Review list" className="space-y-4">
        {pagination.items.length ? (
          pagination.items.map((review) => (
            <SurfaceCard
              className={cn(
                "p-5 sm:p-6",
                review.status === "Under review" &&
                  "border-[color-mix(in_srgb,var(--destructive)_45%,var(--background))] bg-[color-mix(in_srgb,var(--destructive)_6%,var(--background))]",
              )}
              data-review-status={review.status}
              key={review.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarInitials initials={review.initials} />
                  <div>
                    <h2 className="font-bold">{review.author}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <RatingStars value={review.rating} />
                      <span className="text-xs text-[var(--foreground)]">{review.age}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    review.status === "Answered"
                      ? "bg-[color-mix(in_srgb,var(--accent)_28%,var(--background))]"
                      : review.status === "Open"
                        ? "bg-[var(--warning)]"
                        : "bg-[var(--error)]",
                  )}
                >
                  {review.status}
                </span>
              </div>
              <span className="mt-5 inline-block rounded bg-[var(--surface)] px-2 py-1 text-[10px] font-bold tracking-wide uppercase">
                {review.treatment}
              </span>
              <p className="mt-4 text-sm leading-6">{review.body}</p>
              {review.response ? (
                <div className="mt-5 border-l-4 border-[var(--primary)] bg-[var(--surface)] p-4">
                  <div className="text-xs font-bold text-[var(--foreground)]">Clinic response</div>
                  <p className="mt-2 text-sm italic">{review.response}</p>
                </div>
              ) : null}
              {review.notice ? (
                <div className="mt-5 flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--destructive)_35%,var(--background))] bg-[var(--error)] p-4 text-sm">
                  <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span>{review.notice}</span>
                </div>
              ) : null}
              {showManagement ? (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                  {review.status === "Under review" ? (
                    <Button disabled size="small" variant="ghost">
                      <MessageSquareReply aria-hidden="true" className="size-4" /> Responses locked
                    </Button>
                  ) : (
                    <Button
                      onClick={() => openReviewAction(review, "response")}
                      size="small"
                      variant={review.status === "Open" ? "primary" : "ghost"}
                    >
                      {review.status === "Answered" ? (
                        <Pencil aria-hidden="true" className="size-4" />
                      ) : (
                        <MessageSquareReply aria-hidden="true" className="size-4" />
                      )}
                      {review.status === "Answered" ? "Edit response" : "Respond"}
                    </Button>
                  )}
                  {review.status !== "Under review" ? (
                    <Button onClick={() => openReviewAction(review, "note")} size="small" variant="ghost">
                      <StickyNote aria-hidden="true" className="size-4" /> Internal note
                    </Button>
                  ) : null}
                  {review.status === "Open" ? (
                    <Button onClick={() => openReviewAction(review, "appeal")} size="small" variant="ghost">
                      <Flag aria-hidden="true" className="size-4" /> Appeal
                    </Button>
                  ) : null}
                  <Button onClick={() => openReviewAction(review, "history")} size="small" variant="ghost">
                    <FileClock aria-hidden="true" className="size-4" /> History
                  </Button>
                </div>
              ) : null}
            </SurfaceCard>
          ))
        ) : (
          <SurfaceCard className="p-8 text-center">
            <h2 className="text-xl font-bold text-[var(--secondary)]">No matching reviews</h2>
            <p className="mt-2 text-sm text-[var(--foreground)]">
              Adjust the filters to show fixture reviews.
            </p>
          </SurfaceCard>
        )}
      </section>

      {showManagement ? (
        <nav
          aria-label="Review pages"
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="text-sm text-[var(--foreground)]">
            Showing {pagination.rangeStart}–{pagination.rangeEnd} of {filteredReviews.length} prototype
            reviews · {data.total.toLocaleString("en-US")} total public reviews
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              aria-label="Previous review page"
              disabled={pagination.page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              size="icon"
              variant="ghost"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </Button>
            {Array.from({ length: pagination.pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <Button
                aria-current={pageNumber === pagination.page ? "page" : undefined}
                aria-label={`Review page ${pageNumber}`}
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                size="icon"
                variant={pageNumber === pagination.page ? "primary" : "ghost"}
              >
                {pageNumber}
              </Button>
            ))}
            <Button
              aria-label="Next review page"
              disabled={pagination.page === pagination.pageCount}
              onClick={() => setPage((current) => Math.min(pagination.pageCount, current + 1))}
              size="icon"
              variant="ghost"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </nav>
      ) : null}

      {dialogOpen ? (
        <ReviewActionDialog
          key={`${selectedReviewId}-${dialogMode}`}
          mode={dialogMode}
          onOpenChange={setDialogOpen}
          onSubmit={handleDialogSubmit}
          open
          review={selectedReview}
        />
      ) : null}
    </div>
  )
}
