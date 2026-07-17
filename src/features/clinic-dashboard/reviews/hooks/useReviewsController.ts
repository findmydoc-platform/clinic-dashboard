"use client"

import { useEffect, useReducer, useRef } from "react"
import { downloadReviewsCsv } from "../adapters/download-reviews-csv"
import type { ReviewCommands } from "../model/review-commands"
import type { ReviewsData } from "../model/reviews-data"
import { createReviewsState, reviewsReducer } from "../model/reviews.reducer"
import { selectFilteredReviews, selectReviewsViewModel } from "../model/reviews.selectors"
import type { ReviewsActions } from "../model/reviews-view-model"

type UseReviewsControllerInput = Readonly<{
  commands: ReviewCommands
  data: ReviewsData
  showManagement: boolean
}>

const reviewRefreshDelayMs = 320

export function useReviewsController({ commands, data, showManagement }: UseReviewsControllerInput) {
  const [state, dispatch] = useReducer(reviewsReducer, data.items, createReviewsState)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    },
    [],
  )

  const model = selectReviewsViewModel(state, data, showManagement)

  const applyFilters = () => dispatch({ type: "filters-applied" })
  const changeDraftFilters = (filters: Parameters<ReviewsActions["changeDraftFilters"]>[0]) =>
    dispatch({ filters, type: "draft-filters-changed" })
  const changeMobileFiltersOpen = (isOpen: boolean) =>
    dispatch({ isOpen, type: "mobile-filters-open-changed" })
  const changePage = (page: number) => dispatch({ page, type: "page-changed" })
  const closeReviewDialog = () => dispatch({ type: "review-dialog-closed" })
  const openReviewAppeal = (reviewId: string) => dispatch({ reviewId, type: "review-appeal-opened" })
  const openReviewHistory = (reviewId: string) => dispatch({ reviewId, type: "review-history-opened" })
  const openReviewNote = (reviewId: string) => dispatch({ reviewId, type: "review-note-opened" })
  const openReviewResponse = (reviewId: string) => dispatch({ reviewId, type: "review-response-opened" })

  const refreshReviews = () => {
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
    downloadReviewsCsv(selectFilteredReviews(state, data.referenceTime))
    dispatch({ statusMessage: "Review CSV exported.", type: "status-message-changed" })
  }

  const submitReviewAppeal: ReviewsActions["submitReviewAppeal"] = async ({ detail, reason }) => {
    if (state.dialog.kind !== "appeal") return

    const reviewId = state.dialog.reviewId
    const selectedReview = state.reviews.find((review) => review.id === reviewId)
    if (!selectedReview) return

    const review = await commands.submitReviewAppeal(selectedReview, reason, detail)
    dispatch({ review, statusMessage: "Appeal submitted for moderation.", type: "review-mutation-succeeded" })
  }

  const submitReviewNote: ReviewsActions["submitReviewNote"] = async ({ note }) => {
    if (state.dialog.kind !== "note") return

    const reviewId = state.dialog.reviewId
    const selectedReview = state.reviews.find((review) => review.id === reviewId)
    if (!selectedReview) return

    const review = await commands.saveReviewNote(selectedReview, note)
    dispatch({ review, statusMessage: "Internal note saved.", type: "review-mutation-succeeded" })
  }

  const submitReviewResponse: ReviewsActions["submitReviewResponse"] = async ({ response }) => {
    if (state.dialog.kind !== "response") return

    const reviewId = state.dialog.reviewId
    const selectedReview = state.reviews.find((review) => review.id === reviewId)
    if (!selectedReview) return

    const review = await commands.saveReviewResponse(selectedReview, response)
    dispatch({ review, statusMessage: "Review response saved.", type: "review-mutation-succeeded" })
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
