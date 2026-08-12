import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeading } from "@/components/ui/page-heading"
import type { ReviewsActions, ReviewsViewModel } from "../../model/reviews-view-model"
import { RatingSummary } from "../molecules/RatingSummary"
import { ReviewCard } from "../molecules/ReviewCard"
import { ReviewFilters } from "../molecules/ReviewFilters"
import { ReviewPagination } from "../molecules/ReviewPagination"
import { ReviewAppealDialog } from "./ReviewAppealDialog"
import { ReviewHistoryDialog } from "./ReviewHistoryDialog"
import { ReviewResponseDialog } from "./ReviewResponseDialog"

function DialogSlot({ actions, dialog }: Pick<ReviewsViewModel, "dialog"> & { actions: ReviewsActions }) {
  if (dialog.kind === "appeal") {
    return (
      <ReviewAppealDialog
        onClose={actions.closeReviewDialog}
        onSubmit={actions.submitReviewAppeal}
        review={dialog.review}
      />
    )
  }
  if (dialog.kind === "response") {
    return (
      <ReviewResponseDialog
        onClose={actions.closeReviewDialog}
        onSubmit={actions.submitReviewResponse}
        review={dialog.review}
      />
    )
  }
  if (dialog.kind === "history") {
    return (
      <ReviewHistoryDialog
        dialog={dialog}
        onClose={actions.closeReviewDialog}
        onLoadOlder={actions.loadOlderHistory}
      />
    )
  }
  return null
}

export function ReviewsScreen({
  actions,
  model,
}: Readonly<{ actions: ReviewsActions; model: ReviewsViewModel }>) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeading
          data-reviews-heading
          description="Read patient feedback and manage clinic responses and appeals."
          tabIndex={-1}
        >
          Reviews
        </PageHeading>
        <Button disabled={model.isLoading} onClick={actions.refreshReviews} variant="outline">
          {model.isLoading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {model.summary ? (
        <section aria-label="Review summary" className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <Card>
            <RatingSummary count={model.summary.total} value={model.summary.rating} />
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-bold text-[var(--secondary)]">Rating distribution</h2>
            <dl className="mt-5 space-y-3">
              {model.summary.distribution.map((entry) => (
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
          </Card>
        </section>
      ) : null}

      {model.showManagement ? (
        <ReviewFilters
          filters={model.filters.draft}
          isDirty={model.filters.isDirty}
          isMobileOpen={model.filters.isMobileOpen}
          onApply={actions.applyFilters}
          onChange={actions.changeDraftFilters}
          onMobileOpenChange={actions.changeMobileFiltersOpen}
          treatmentOptions={model.filters.treatmentOptions}
        />
      ) : null}

      <p aria-live="polite" className="min-h-5 text-sm text-[var(--foreground)]" role="status">
        {model.statusMessage}
      </p>

      <section aria-busy={model.isLoading} aria-label="Review list" className="space-y-4">
        {model.list?.items.length ? (
          model.list.items.map((review) => (
            <ReviewCard
              key={review.id}
              onAppealOpen={actions.openReviewAppeal}
              onHistoryOpen={actions.openReviewHistory}
              onResponseOpen={actions.openReviewResponse}
              review={review}
              showManagement={model.showManagement}
            />
          ))
        ) : (
          <Card className="p-8 text-center">
            <h2 className="text-xl font-bold text-[var(--secondary)]">
              {model.list ? "No matching reviews" : "Reviews unavailable"}
            </h2>
            <p className="mt-2 text-sm text-[var(--foreground)]">
              {model.list
                ? "Adjust the filters to show reviews."
                : "Refresh to try loading clinic reviews again."}
            </p>
          </Card>
        )}
      </section>

      {model.list ? (
        <ReviewPagination
          onPageChange={actions.changePage}
          page={model.list.page}
          pageCount={model.list.pageCount}
          pageSize={model.list.limit}
          total={model.list.total}
        />
      ) : null}
      <DialogSlot actions={actions} dialog={model.dialog} />
    </div>
  )
}
