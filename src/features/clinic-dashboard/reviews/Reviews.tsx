"use client"

import { useEffect, useRef } from "react"
import { ReviewsScreen } from "./components/organisms/ReviewsScreen"
import { useReviewsController } from "./hooks/useReviewsController"
import type { ReviewCommands } from "./model/review-commands"
import type { ReviewsData } from "./model/reviews-data"

export type ReviewsProps = Readonly<{
  commands: ReviewCommands
  data: ReviewsData
  focusHeading?: boolean
  onFocusHandled?: () => void
  showManagement: boolean
}>

export function Reviews({
  commands,
  data,
  focusHeading = false,
  onFocusHandled,
  showManagement,
}: ReviewsProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const controller = useReviewsController({ commands, data, showManagement })

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
