"use client"

import { useEffect, useLayoutEffect, useReducer, useRef } from "react"
import { downloadReviewsCsv } from "../adapters/download-reviews-csv"
import type { ReviewCommands } from "../model/review-commands"
import type { ReviewsSnapshot } from "../model/reviews-snapshot"
import { createReviewsState, reviewsReducer } from "../model/reviews.reducer"
import { selectFilteredReviews, selectReviewsViewModel } from "../model/reviews.selectors"
import type { ReviewsActions } from "../model/reviews-view-model"

type UseReviewsControllerInput = Readonly<{
  commands: ReviewCommands
  showManagement: boolean
  snapshot: ReviewsSnapshot
}>

const reviewRefreshDelayMs = 320

export function useReviewsController({ commands, showManagement, snapshot }: UseReviewsControllerInput) {
  const [state, dispatch] = useReducer(reviewsReducer, snapshot.items, createReviewsState)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const managementEnabledRef = useRef(showManagement)
  const mutationGenerationRef = useRef(0)

  useEffect(
    () => () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    },
    [],
  )

  useLayoutEffect(() => {
    const wasManagementEnabled = managementEnabledRef.current
    managementEnabledRef.current = showManagement
    if (showManagement) return

    if (wasManagementEnabled) mutationGenerationRef.current += 1
  }, [showManagement])

  useEffect(() => {
    if (showManagement) return

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = undefined
    }
    dispatch({ type: "management-withdrawn" })
  }, [showManagement])

  const model = selectReviewsViewModel(state, snapshot, showManagement)
  const dispatchIfManagement = (action: Parameters<typeof dispatch>[0]) => {
    if (showManagement) dispatch(action)
  }

  const applyFilters = () => dispatchIfManagement({ type: "filters-applied" })
  const changeDraftFilters = (filters: Parameters<ReviewsActions["changeDraftFilters"]>[0]) =>
    dispatchIfManagement({ filters, type: "draft-filters-changed" })
  const changeMobileFiltersOpen = (isOpen: boolean) =>
    dispatchIfManagement({ isOpen, type: "mobile-filters-open-changed" })
  const changePage = (page: number) => dispatchIfManagement({ page, type: "page-changed" })
  const closeReviewDialog = () => dispatch({ type: "review-dialog-closed" })
  const openReviewAppeal = (reviewId: string) =>
    dispatchIfManagement({ reviewId, type: "review-appeal-opened" })
  const openReviewHistory = (reviewId: string) =>
    dispatchIfManagement({ reviewId, type: "review-history-opened" })
  const openReviewNote = (reviewId: string) => dispatchIfManagement({ reviewId, type: "review-note-opened" })
  const openReviewResponse = (reviewId: string) =>
    dispatchIfManagement({ reviewId, type: "review-response-opened" })

  const refreshReviews = () => {
    if (!showManagement) return
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    dispatch({ type: "refresh-started" })
    refreshTimerRef.current = setTimeout(() => {
      dispatch({
        statusMessage: "Reviews refreshed.",
        type: "refresh-completed",
      })
      refreshTimerRef.current = undefined
    }, reviewRefreshDelayMs)
  }

  const exportReviews = () => {
    if (!showManagement) return
    downloadReviewsCsv(selectFilteredReviews(state, snapshot.referenceTime))
    dispatch({ statusMessage: "Review CSV exported.", type: "status-message-changed" })
  }

  const submitReviewAppeal: ReviewsActions["submitReviewAppeal"] = async ({ detail, reason }) => {
    if (!showManagement) return "discarded"
    if (state.dialog.kind !== "appeal") return "discarded"

    const reviewId = state.dialog.reviewId
    const selectedReview = state.reviews.find((review) => review.id === reviewId)
    if (!selectedReview) return "discarded"

    const mutationGeneration = mutationGenerationRef.current
    const review = await commands.submitReviewAppeal(selectedReview, reason, detail)
    if (!managementEnabledRef.current || mutationGeneration !== mutationGenerationRef.current) {
      return "discarded"
    }
    dispatch({ review, statusMessage: "Appeal submitted for moderation.", type: "review-mutation-succeeded" })
    return "applied"
  }

  const submitReviewNote: ReviewsActions["submitReviewNote"] = async ({ note }) => {
    if (!showManagement) return "discarded"
    if (state.dialog.kind !== "note") return "discarded"

    const reviewId = state.dialog.reviewId
    const selectedReview = state.reviews.find((review) => review.id === reviewId)
    if (!selectedReview) return "discarded"

    const mutationGeneration = mutationGenerationRef.current
    const review = await commands.saveReviewNote(selectedReview, note)
    if (!managementEnabledRef.current || mutationGeneration !== mutationGenerationRef.current) {
      return "discarded"
    }
    dispatch({ review, statusMessage: "Internal note saved.", type: "review-mutation-succeeded" })
    return "applied"
  }

  const submitReviewResponse: ReviewsActions["submitReviewResponse"] = async ({ response }) => {
    if (!showManagement) return "discarded"
    if (state.dialog.kind !== "response") return "discarded"

    const reviewId = state.dialog.reviewId
    const selectedReview = state.reviews.find((review) => review.id === reviewId)
    if (!selectedReview) return "discarded"

    const mutationGeneration = mutationGenerationRef.current
    const review = await commands.submitReviewResponseForModeration(selectedReview, response)
    if (!managementEnabledRef.current || mutationGeneration !== mutationGenerationRef.current) {
      return "discarded"
    }
    dispatch({
      review,
      statusMessage: "Review response submitted for moderation.",
      type: "review-mutation-succeeded",
    })
    return "applied"
  }

  const actions: ReviewsActions = {
    applyFilters,
    changeDraftFilters,
    changeMobileFiltersOpen,
    changePage,
    closeReviewDialog,
    exportReviews,
    openReviewAppeal,
    openReviewHistory,
    openReviewNote,
    openReviewResponse,
    refreshReviews,
    submitReviewAppeal,
    submitReviewNote,
    submitReviewResponse,
  }

  return { actions, model }
}
