"use client"

import { useEffect, useRef } from "react"
import { ReviewsScreen } from "./components/organisms/ReviewsScreen"
import { useReviewsController } from "./hooks/useReviewsController"
import type { ReviewSourceCommands } from "./model/review-source-commands"
import type { ReviewsSourceSnapshot } from "./model/review-source"

export type ReviewsProps = Readonly<{
  commands: ReviewSourceCommands
  focusTarget?: ReviewFocusTarget
  onFocusHandled?: () => void
  showManagement: boolean
  snapshot?: ReviewsSourceSnapshot
}>

export type ReviewFocusTarget = Readonly<{ kind: "heading" }> | Readonly<{ kind: "review"; reviewId: string }>

export function Reviews({ commands, focusTarget, onFocusHandled, showManagement, snapshot }: ReviewsProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const controller = useReviewsController({ commands, showManagement, snapshot })
  const { focusReview } = controller

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
      <ReviewsScreen actions={controller.actions} model={controller.model} />
    </div>
  )
}
