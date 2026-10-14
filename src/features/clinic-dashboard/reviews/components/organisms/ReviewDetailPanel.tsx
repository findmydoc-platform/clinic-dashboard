"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ReviewDetailState, ReviewOpeningRequest, ReviewOpeningResult } from "../../model/review-opening"
import type { ReviewsActions } from "../../model/reviews-view-model"
import { ReviewCard } from "../molecules/ReviewCard"

type ReviewDetailPanelProps = Readonly<{
  detail: ReviewDetailState
  actions: Pick<ReviewsActions, "openReviewAppeal" | "openReviewHistory" | "openReviewResponse">
  showManagement: boolean
  openingRequest?: ReviewOpeningRequest
  onOpeningResult?: (result: ReviewOpeningResult) => void
  onClose?: () => void
}>
export function ReviewDetailPanel({
  detail,
  actions,
  showManagement,
  openingRequest,
  onOpeningResult,
  onClose,
}: ReviewDetailPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const displayedRequest = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (
      !openingRequest ||
      detail.status !== "ready" ||
      detail.review.id !== openingRequest.reviewId ||
      displayedRequest.current === openingRequest.requestId
    )
      return
    const frame = requestAnimationFrame(() => {
      const heading = headingRef.current
      if (!heading?.isConnected || heading.getClientRects().length === 0) return
      const anchor = openingRequest.anchor
      const anchorTarget =
        anchor && anchor.kind !== "occurrence"
          ? heading
              .closest("section")
              ?.querySelector<HTMLElement>(
                `[data-review-anchor-kind="${anchor.kind}"][data-review-anchor-id="${CSS.escape(anchor.id)}"]`,
              )
          : undefined
      const target = anchorTarget ?? heading
      target.focus()
      if (document.activeElement !== target) return
      target.scrollIntoView({ block: "nearest" })
      displayedRequest.current = openingRequest.requestId
      onOpeningResult?.({
        requestId: openingRequest.requestId,
        reviewId: openingRequest.reviewId,
        status: "displayed",
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [detail, openingRequest, onOpeningResult])
  return (
    <section aria-label="Selected review" className="space-y-3" aria-busy={detail.status === "loading"}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-[var(--secondary)]" tabIndex={-1} ref={headingRef}>
          Review details
        </h2>
        {onClose ? (
          <Button variant="outline" onClick={onClose}>
            Close review details
          </Button>
        ) : null}
      </div>
      {detail.status === "ready" ? (
        <ReviewCard
          review={detail.review}
          showManagement={showManagement}
          onAppealOpen={actions.openReviewAppeal}
          onHistoryOpen={actions.openReviewHistory}
          onResponseOpen={actions.openReviewResponse}
        />
      ) : (
        <Card className="p-5" role="status">
          {detail.status === "loading" ? "Loading review details…" : "This review is unavailable."}
        </Card>
      )}
    </section>
  )
}
