"use client"

import { useEffect, useRef } from "react"
import { ReviewsScreen } from "./components/organisms/ReviewsScreen"
import { useReviewsController } from "./hooks/useReviewsController"
import type { ReviewCommands } from "./model/review-commands"
import type { ReviewsSnapshot } from "./model/reviews-snapshot"

export type ReviewsProps = Readonly<{
  commands: ReviewCommands
  focusHeading?: boolean
  onFocusHandled?: () => void
  showManagement: boolean
  snapshot: ReviewsSnapshot
}>

export function Reviews({
  commands,
  focusHeading = false,
  onFocusHandled,
  showManagement,
  snapshot,
}: ReviewsProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const controller = useReviewsController({ commands, showManagement, snapshot })

  useEffect(() => {
    if (!focusHeading) return

    const frame = requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLElement>("[data-reviews-heading]")?.focus()
      onFocusHandled?.()
    })

    return () => cancelAnimationFrame(frame)
  }, [focusHeading, onFocusHandled])

  return (
    <div ref={rootRef}>
      <ReviewsScreen actions={controller.actions} model={controller.model} />
    </div>
  )
}
