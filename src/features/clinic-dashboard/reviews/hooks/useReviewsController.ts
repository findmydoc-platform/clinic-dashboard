"use client"

import { useCallback, useRef, useState } from "react"
import type { ReviewSourceCommands } from "../model/review-source-commands"
import { ReviewSourceCommandError } from "../model/review-source-commands"
import {
  canSubmitReviewResponse,
  defaultReviewListFilters,
  type ReviewHistorySnapshot,
  type ReviewListFilters,
  type ReviewsSourceSnapshot,
} from "../model/review-source"
import type { ReviewDialogModel, ReviewsActions } from "../model/reviews-view-model"

type Input = Readonly<{
  commands: ReviewSourceCommands
  showManagement: boolean
  snapshot?: ReviewsSourceSnapshot
}>

function errorMessage(error: unknown, action: "history" | "load" | "mutation") {
  if (error instanceof ReviewSourceCommandError) {
    if (error.kind === "conflict") return "This workflow changed. Refresh the reviews and try again."
    if (error.kind === "not-found") return "This review is no longer available."
    if (error.kind === "timeout") return "The review service took too long to respond. Try again."
    if (error.kind === "rejected")
      return "The request could not be accepted. Check the details and try again."
  }
  if (action === "history") return "Review history could not be loaded. Try again."
  if (action === "mutation") return "The change could not be submitted. Try again."
  return "Reviews are temporarily unavailable. Try again."
}

export function useReviewsController({ commands, showManagement, snapshot: initialSnapshot }: Input) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [appliedFilters, setAppliedFilters] = useState<ReviewListFilters>(defaultReviewListFilters)
  const [draftFilters, setDraftFilters] = useState<ReviewListFilters>(defaultReviewListFilters)
  const [dialog, setDialog] = useState<ReviewDialogModel>({ kind: "closed" })
  const [isLoading, setIsLoading] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState(
    initialSnapshot ? "" : "Reviews are temporarily unavailable.",
  )
  const dialogOperationId = useRef(0)
  const requestId = useRef(0)

  const load = useCallback(
    async (filters: ReviewListFilters, page: number, successMessage = "") => {
      const currentRequest = ++requestId.current
      setIsLoading(true)
      setStatusMessage("Loading reviews…")
      try {
        const next = await commands.loadReviews(filters, page)
        if (currentRequest !== requestId.current) return
        setSnapshot(next)
        setStatusMessage(successMessage)
      } catch (error) {
        if (currentRequest !== requestId.current) return
        setStatusMessage(errorMessage(error, "load"))
      } finally {
        if (currentRequest === requestId.current) setIsLoading(false)
      }
    },
    [commands],
  )

  const findReview = (reviewId: string) => snapshot?.page.items.find(({ id }) => id === reviewId)
  const replaceReview = (reviewId: string, review: NonNullable<ReturnType<typeof findReview>>) => {
    setSnapshot((current) =>
      current
        ? {
            ...current,
            page: {
              ...current.page,
              items: current.page.items.map((item) => (item.id === reviewId ? review : item)),
            },
          }
        : current,
    )
  }

  const openHistory = async (reviewId: string) => {
    const review = findReview(reviewId)
    if (!review) return
    const operationId = ++dialogOperationId.current
    setDialog({ isLoading: true, isLoadingOlder: false, kind: "history", review })
    try {
      const history = await commands.loadHistory(reviewId)
      if (operationId !== dialogOperationId.current) return
      setDialog({ history, isLoading: false, isLoadingOlder: false, kind: "history", review })
    } catch (error) {
      if (operationId !== dialogOperationId.current) return
      setDialog({
        error: errorMessage(error, "history"),
        isLoading: false,
        isLoadingOlder: false,
        kind: "history",
        review,
      })
    }
  }

  const loadOlderHistory = async () => {
    if (dialog.kind !== "history" || !dialog.history?.publication.nextCursor) return
    const current = dialog
    const currentHistory = dialog.history
    const operationId = ++dialogOperationId.current
    setDialog({ ...current, error: undefined, isLoadingOlder: true })
    try {
      const next = await commands.loadHistory(current.review.id, currentHistory.publication.nextCursor)
      if (operationId !== dialogOperationId.current) return
      setDialog({
        ...current,
        history: {
          ...next,
          appeal: currentHistory.appeal,
          publication: {
            ...next.publication,
            entries: [...currentHistory.publication.entries, ...next.publication.entries],
          },
          response: currentHistory.response,
        },
        isLoadingOlder: false,
      })
    } catch (error) {
      if (operationId !== dialogOperationId.current) return
      if (error instanceof ReviewSourceCommandError && error.kind === "history-changed") {
        setDialog({ ...current, history: undefined, isLoading: true, isLoadingOlder: false })
        try {
          const restarted = await commands.loadHistory(current.review.id)
          if (operationId !== dialogOperationId.current) return
          setDialog({ ...current, history: restarted, isLoading: false, isLoadingOlder: false })
        } catch (restartError) {
          if (operationId !== dialogOperationId.current) return
          setDialog({
            ...current,
            error: errorMessage(restartError, "history"),
            isLoading: false,
            isLoadingOlder: false,
          })
        }
        return
      }
      setDialog({ ...current, error: errorMessage(error, "history"), isLoadingOlder: false })
    }
  }

  const submitReviewResponse: ReviewsActions["submitReviewResponse"] = async (body) => {
    if (dialog.kind !== "response") return "discarded"
    const currentDialog = dialog
    const operationId = dialogOperationId.current
    try {
      const review = await commands.submitResponse(currentDialog.review.id, body)
      replaceReview(currentDialog.review.id, review)
      setStatusMessage("Response submitted for moderation.")
      return operationId === dialogOperationId.current ? "applied" : "discarded"
    } catch (error) {
      if (operationId !== dialogOperationId.current) return "discarded"
      setStatusMessage(errorMessage(error, "mutation"))
      throw error
    }
  }

  const submitReviewAppeal: ReviewsActions["submitReviewAppeal"] = async (submission) => {
    if (dialog.kind !== "appeal") return "discarded"
    const currentDialog = dialog
    const operationId = dialogOperationId.current
    try {
      const review = await commands.submitAppeal(currentDialog.review.id, submission)
      replaceReview(currentDialog.review.id, review)
      setStatusMessage("Appeal submitted for platform review.")
      return operationId === dialogOperationId.current ? "applied" : "discarded"
    } catch (error) {
      if (operationId !== dialogOperationId.current) return "discarded"
      setStatusMessage(errorMessage(error, "mutation"))
      throw error
    }
  }

  const actions: ReviewsActions = {
    applyFilters() {
      setAppliedFilters(draftFilters)
      void load(draftFilters, 1, "Filters applied.")
    },
    changeDraftFilters: setDraftFilters,
    changeMobileFiltersOpen: setIsMobileOpen,
    changePage(page) {
      void load(appliedFilters, page)
    },
    closeReviewDialog() {
      dialogOperationId.current += 1
      setDialog({ kind: "closed" })
    },
    loadOlderHistory() {
      void loadOlderHistory()
    },
    openReviewAppeal(reviewId) {
      const review = findReview(reviewId)
      if (review && showManagement && !review.appeal) {
        dialogOperationId.current += 1
        setDialog({ kind: "appeal", review })
      }
    },
    openReviewHistory(reviewId) {
      void openHistory(reviewId)
    },
    openReviewResponse(reviewId) {
      const review = findReview(reviewId)
      if (review && showManagement && canSubmitReviewResponse(review)) {
        dialogOperationId.current += 1
        setDialog({ kind: "response", review })
      }
    },
    refreshReviews() {
      void load(appliedFilters, snapshot?.page.page ?? 1, "Reviews refreshed.")
    },
    submitReviewAppeal,
    submitReviewResponse,
  }

  return {
    actions,
    focusReview: useCallback(
      (reviewId: string) => Boolean(snapshot?.page.items.some(({ id }) => id === reviewId)),
      [snapshot],
    ),
    model: {
      dialog,
      filters: {
        draft: draftFilters,
        isDirty: JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters),
        isMobileOpen,
        treatmentOptions: snapshot?.treatments ?? [],
      },
      isLoading,
      list: snapshot?.page,
      showManagement,
      statusMessage,
      summary: snapshot?.summary,
    },
  }
}
