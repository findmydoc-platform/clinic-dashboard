"use client"

import { useEffect, useRef, useState } from "react"
import type { ReviewOpeningRequest, ReviewOpeningResult } from "./model/review-opening"
import { ReviewsScreen } from "./components/organisms/ReviewsScreen"
import { useReviewsController } from "./hooks/useReviewsController"
import type { ReviewSourceCommands } from "./model/review-source-commands"
import type { ReviewsSourceSnapshot } from "./model/review-source"

export type ReviewsProps = Readonly<{
  openingRequest?: ReviewOpeningRequest
  onOpeningResult?: (result: ReviewOpeningResult) => void
  onSessionLost?: () => void
  isActive?: boolean
  commands: ReviewSourceCommands
  focusTarget?: ReviewFocusTarget
  onNavigationRequestChange?: (
    request: ((continuation: () => void, onCancel?: () => void) => void) | null,
  ) => void
  onFocusHandled?: () => void
  showManagement: boolean
  snapshot?: ReviewsSourceSnapshot
}>

export type ReviewFocusTarget = Readonly<{ kind: "heading" }> | Readonly<{ kind: "review"; reviewId: string }>

export function Reviews({
  commands,
  openingRequest,
  onOpeningResult,
  isActive = true,
  onSessionLost,
  focusTarget,
  onFocusHandled,
  onNavigationRequestChange,
  showManagement,
  snapshot,
}: ReviewsProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const controller = useReviewsController({ commands, onSessionLost, showManagement, snapshot })
  const [loadedOpening, setLoadedOpening] = useState<ReviewOpeningRequest>()
  const cancelExactReviewRead = controller.cancelExactReviewRead
  const openReviewRef = useRef(controller.loadExactReview)
  useEffect(() => {
    openReviewRef.current = controller.loadExactReview
  }, [controller.loadExactReview])
  useEffect(() => {
    if (!openingRequest || !isActive) return
    const abort = new AbortController()
    void openReviewRef.current(openingRequest.reviewId, abort.signal).then((loaded) => {
      if (abort.signal.aborted) return
      if (loaded) setLoadedOpening(openingRequest)
      else
        onOpeningResult?.({
          requestId: openingRequest.requestId,
          reviewId: openingRequest.reviewId,
          status: "unavailable",
        })
    })
    return () => {
      abort.abort()
      cancelExactReviewRead()
    }
  }, [openingRequest, isActive, onOpeningResult, cancelExactReviewRead])
  const closeExactReview = () => {
    controller.closeExactReview()
    requestAnimationFrame(() =>
      rootRef.current?.querySelector<HTMLElement>("[data-reviews-heading]")?.focus(),
    )
    if (openingRequest)
      onOpeningResult?.({
        requestId: openingRequest.requestId,
        reviewId: openingRequest.reviewId,
        status: "cancelled",
      })
  }
  const { focusReview } = controller
  const closeReviewDialog = controller.actions.closeReviewDialog
  const dialogKind = controller.model.dialog.kind
  useEffect(() => {
    if (dialogKind === "closed") onNavigationRequestChange?.(null)
    if (dialogKind !== "history") return
    onNavigationRequestChange?.((continuation) => {
      closeReviewDialog()
      continuation()
    })
    return () => onNavigationRequestChange?.(null)
  }, [closeReviewDialog, dialogKind, onNavigationRequestChange])

  useEffect(() => {
    if (!focusTarget) return

    if (focusTarget.kind === "heading") {
      const frame = requestAnimationFrame(() => {
        const heading = rootRef.current?.querySelector<HTMLElement>("[data-reviews-heading]")
        heading?.focus()
        if (heading) onFocusHandled?.()
      })

      return () => cancelAnimationFrame(frame)
    }

    const reviewId = focusTarget.reviewId
    if (!reviewId || !focusReview(reviewId)) {
      const frame = requestAnimationFrame(() => {
        const heading = rootRef.current?.querySelector<HTMLElement>("[data-reviews-heading]")
        heading?.focus()
        if (heading) onFocusHandled?.()
      })
      return () => cancelAnimationFrame(frame)
    }

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const review = [...(rootRef.current?.querySelectorAll<HTMLElement>("[data-review-id]") ?? [])].find(
          (element) => element.dataset.reviewId === reviewId,
        )
        review?.scrollIntoView({ block: "center" })
        review?.focus()
        if (review) onFocusHandled?.()
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [focusReview, focusTarget, onFocusHandled])

  return (
    <div ref={rootRef}>
      <ReviewsScreen
        actions={controller.actions}
        model={controller.model}
        onNavigationRequestChange={onNavigationRequestChange}
        openingRequest={
          isActive && loadedOpening?.requestId === openingRequest?.requestId ? loadedOpening : undefined
        }
        onOpeningResult={onOpeningResult}
        onExactReviewClose={closeExactReview}
      />
    </div>
  )
}
