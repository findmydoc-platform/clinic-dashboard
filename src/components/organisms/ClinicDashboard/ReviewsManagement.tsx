"use client"

import { useEffect, useRef } from "react"
import { Download, Filter, Flag, MessageSquareReply, RefreshCw } from "lucide-react"
import { AvatarInitials, RatingStars, WorkspaceHeading } from "@/components/atoms/DashboardPrimitives"
import { RatingSummary, SurfaceCard } from "@/components/molecules/DashboardCards"
import { Button } from "@/components/ui/button"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import { isGateVisible, type ClinicDashboardVariant } from "@/lib/clinic-dashboard/visibility"
import { cn } from "@/lib/utils"

export function ReviewsManagement({
  focusHeading = false,
  onFocusHandled,
  variant,
}: {
  focusHeading?: boolean
  onFocusHandled?: () => void
  variant: ClinicDashboardVariant
}) {
  const data = clinicDashboardFixture.reviews
  const showManagement = isGateVisible(variant, "reviewManagement")
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!focusHeading) return

    const frame = requestAnimationFrame(() => {
      headingRef.current?.focus()
      onFocusHandled?.()
    })

    return () => cancelAnimationFrame(frame)
  }, [focusHeading, onFocusHandled])

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
          <Button variant="outline">
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
        <SurfaceCard className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          {["Period", "Rating", "Treatment", "Status"].map((label) => (
            <label
              className="grid gap-1 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase"
              key={label}
            >
              {label}
              <select className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal text-[var(--foreground)]">
                <option>All {label.toLowerCase()}</option>
              </select>
            </label>
          ))}
          <div className="flex items-end gap-2">
            <Button aria-label="Apply filters" size="icon" variant="outline">
              <Filter aria-hidden="true" className="size-4" />
            </Button>
            <Button aria-label="Refresh reviews" size="icon" variant="outline">
              <RefreshCw aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </SurfaceCard>
      ) : null}

      <section aria-label="Review list" className="space-y-4">
        {data.items.map((review) => (
          <SurfaceCard
            className={cn(
              "p-5 sm:p-6",
              review.status === "Under review" &&
                "border-[color-mix(in_srgb,var(--destructive)_45%,var(--background))] bg-[color-mix(in_srgb,var(--destructive)_6%,var(--background))]",
            )}
            data-review-status={review.status}
            key={review.author}
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
            {"response" in review && review.response ? (
              <div className="mt-5 border-l-4 border-[var(--primary)] bg-[var(--surface)] p-4">
                <div className="text-xs font-bold text-[var(--foreground)]">Clinic response</div>
                <p className="mt-2 text-sm italic">{review.response}</p>
              </div>
            ) : null}
            {"notice" in review && review.notice ? (
              <div className="mt-5 rounded-lg border border-[color-mix(in_srgb,var(--destructive)_35%,var(--background))] bg-[var(--error)] p-4 text-sm">
                {review.notice}
              </div>
            ) : null}
            {showManagement ? (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                <Button size="small" variant={review.status === "Open" ? "primary" : "ghost"}>
                  <MessageSquareReply aria-hidden="true" className="size-4" />{" "}
                  {review.status === "Answered" ? "Edit response" : "Respond"}
                </Button>
                <Button size="small" variant="ghost">
                  <Flag aria-hidden="true" className="size-4" /> Appeal
                </Button>
              </div>
            ) : null}
          </SurfaceCard>
        ))}
      </section>
      {showManagement ? (
        <nav aria-label="Review pages" className="flex items-center justify-between gap-4">
          <span className="text-sm text-[var(--foreground)]">Showing 1–10 of 1,248 reviews</span>
          <div className="flex gap-2">
            {[1, 2, 3].map((page) => (
              <Button
                aria-current={page === 1 ? "page" : undefined}
                key={page}
                size="icon"
                variant={page === 1 ? "primary" : "ghost"}
              >
                {page}
              </Button>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  )
}
