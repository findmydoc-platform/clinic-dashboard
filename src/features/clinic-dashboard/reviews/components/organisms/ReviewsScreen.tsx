import { Download } from "lucide-react"
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
import { ReviewNoteDialog } from "./ReviewNoteDialog"
import { ReviewResponseDialog } from "./ReviewResponseDialog"

type ReviewsScreenProps = Readonly<{
  actions: ReviewsActions
  model: ReviewsViewModel
}>

type ReviewDialogSlotProps = Readonly<{
  actions: ReviewsActions
  dialog: ReviewsViewModel["dialog"]
}>

function ReviewDialogSlot({ actions, dialog }: ReviewDialogSlotProps) {
  switch (dialog.kind) {
    case "appeal":
      return (
        <ReviewAppealDialog
          key={dialog.review.id}
          onClose={actions.closeReviewDialog}
          onSubmit={actions.submitReviewAppeal}
          review={dialog.review}
        />
      )
    case "closed":
      return null
    case "history":
      return (
        <ReviewHistoryDialog
          key={dialog.review.id}
          onClose={actions.closeReviewDialog}
          review={dialog.review}
        />
      )
    case "note":
      return (
        <ReviewNoteDialog
          key={dialog.review.id}
          onClose={actions.closeReviewDialog}
          onSubmit={actions.submitReviewNote}
          review={dialog.review}
        />
      )
    case "response":
      return (
        <ReviewResponseDialog
          key={dialog.review.id}
          onClose={actions.closeReviewDialog}
          onSubmit={actions.submitReviewResponse}
          review={dialog.review}
        />
      )
  }
}

export function ReviewsScreen({ actions, model }: ReviewsScreenProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageHeading
          data-reviews-heading
          description={
            model.showManagement
              ? "Manage patient feedback and respond to reviews."
              : "View patient feedback and published review activity."
          }
          tabIndex={-1}
        >
          Reviews
        </PageHeading>
        {model.showManagement ? (
          <Button onClick={actions.exportReviews} variant="outline">
            <Download aria-hidden="true" className="size-4" /> Export
          </Button>
        ) : null}
      </div>

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

      {model.showManagement ? (
        <ReviewFilters
          filters={model.filters.draft}
          isDirty={model.filters.isDirty}
          isMobileOpen={model.filters.isMobileOpen}
          isRefreshing={model.isRefreshing}
          onApply={actions.applyFilters}
          onChange={actions.changeDraftFilters}
          onMobileOpenChange={actions.changeMobileFiltersOpen}
          onRefresh={actions.refreshReviews}
          treatmentOptions={model.filters.treatmentOptions}
        />
      ) : null}

      <p aria-live="polite" className="min-h-5 text-sm text-[var(--foreground)]" role="status">
        {model.statusMessage}
      </p>

      <section aria-label="Review list" className="space-y-4">
        {model.list.reviews.length ? (
          model.list.reviews.map((review) => (
            <ReviewCard
              key={review.id}
              onAppealOpen={actions.openReviewAppeal}
              onHistoryOpen={actions.openReviewHistory}
              onNoteOpen={actions.openReviewNote}
              onResponseOpen={actions.openReviewResponse}
              review={review}
              showManagement={model.showManagement}
            />
          ))
        ) : (
          <Card className="p-8 text-center">
            <h2 className="text-xl font-bold text-[var(--secondary)]">No matching reviews</h2>
            <p className="mt-2 text-sm text-[var(--foreground)]">Adjust the filters to show reviews.</p>
          </Card>
        )}
      </section>

      {model.showManagement ? (
        <ReviewPagination
          filteredCount={model.list.filteredCount}
          onPageChange={actions.changePage}
          page={model.list.page}
          pageCount={model.list.pageCount}
          rangeEnd={model.list.rangeEnd}
          rangeStart={model.list.rangeStart}
          totalPublicReviews={model.list.totalPublicReviews}
        />
      ) : null}

      <ReviewDialogSlot actions={actions} dialog={model.dialog} />
    </div>
  )
}
