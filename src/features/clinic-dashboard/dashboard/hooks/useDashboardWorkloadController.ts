"use client"

import { useCallback, useEffect, useState } from "react"
import type { InquiryOpenInventoryCommands } from "@/features/clinic-dashboard/messages/public"
import {
  useReviewWorkloadController,
  type ReviewSourceCommands,
} from "@/features/clinic-dashboard/reviews/public"
import { useOpenInquiryInventory } from "./useOpenInquiryInventory"

export type DashboardOverviewRefreshClock = Readonly<{
  schedule: (refresh: () => void, intervalMs: number) => () => void
}>

const browserRefreshClock: DashboardOverviewRefreshClock = {
  schedule: (refresh, intervalMs) => {
    const interval = window.setInterval(refresh, intervalMs)
    return () => window.clearInterval(interval)
  },
}

type Input = Readonly<{
  scope: string
  isActive: boolean
  inquiryCommands: InquiryOpenInventoryCommands
  reviewCommands: ReviewSourceCommands
  refreshClock?: DashboardOverviewRefreshClock
  onSessionLost?: () => void
  onAccessLost?: () => void
}>

export function useDashboardWorkloadController({
  scope,
  isActive,
  inquiryCommands,
  reviewCommands,
  refreshClock = browserRefreshClock,
  onSessionLost,
  onAccessLost,
}: Input) {
  const [isDocumentVisible, setDocumentVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState !== "hidden",
  )
  const [protectedScope, setProtectedScope] = useState<string>()
  const sessionLost = useCallback(() => {
    setProtectedScope(scope)
    onSessionLost?.()
  }, [scope, onSessionLost])
  const accessLost = useCallback(() => {
    setProtectedScope(scope)
    onAccessLost?.()
  }, [scope, onAccessLost])
  const reviewAccessFailure = useCallback(
    (failure: "unauthorized" | "forbidden") => {
      if (failure === "unauthorized") sessionLost()
      else accessLost()
    },
    [sessionLost, accessLost],
  )
  const isProtectedScope = protectedScope === scope
  const enabled = isActive && isDocumentVisible && !isProtectedScope
  const inquiries = useOpenInquiryInventory({
    scope,
    enabled,
    commands: inquiryCommands,
    onSessionLost: sessionLost,
    onAccessLost: accessLost,
  })
  const reviews = useReviewWorkloadController({
    scope,
    enabled,
    commands: reviewCommands,
    onAccessFailure: reviewAccessFailure,
  })
  const refreshInquiries = inquiries.refresh
  const refreshReviews = reviews.actions.retry
  useEffect(() => {
    const visibility = () => setDocumentVisible(document.visibilityState !== "hidden")
    document.addEventListener("visibilitychange", visibility)
    return () => document.removeEventListener("visibilitychange", visibility)
  }, [])
  useEffect(() => {
    if (!enabled) return
    const refresh = () => {
      if (document.visibilityState === "hidden") return
      void refreshInquiries()
      void refreshReviews()
    }
    const stopClock = refreshClock.schedule(refresh, 60_000)
    window.addEventListener("focus", refresh)
    return () => {
      stopClock()
      window.removeEventListener("focus", refresh)
    }
  }, [enabled, refreshInquiries, refreshReviews, refreshClock])
  return {
    inquiries: isProtectedScope ? { ...inquiries, state: { status: "unavailable" as const } } : inquiries,
    reviews: isProtectedScope ? { ...reviews, model: { status: "unavailable" as const } } : reviews,
  }
}
