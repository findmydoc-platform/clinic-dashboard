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
import type { ReviewDetailState } from "../model/review-opening"
import type { ReviewDialogModel, ReviewsActions } from "../model/reviews-view-model"

type Input = Readonly<{
  commands: ReviewSourceCommands
  onSessionLost?: () => void
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

export function useReviewsController({
  commands,
  onSessionLost,
  showManagement,
  snapshot: initialSnapshot,
}: Input) {
  const [exactReview, setExactReview] = useState<ReviewDetailState>()
  const exactGeneration = useRef(0)
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [appliedFilters, setAppliedFilters] = useState<ReviewListFilters>(defaultReviewListFilters)
  const [draftFilters, setDraftFilters] = useState<ReviewListFilters>(defaultReviewListFilters)
  const [dialog, setDialog] = useState<ReviewDialogModel>({ kind: "closed" })
  const [isListStale, setIsListStale] = useState(false)
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
        setIsListStale(false)
        setExactReview((current) => {
          if (current?.status !== "ready") return current
          const matching = next.page.items.find(({ id }) => id === current.review.id)
          return matching ? { status: "ready", review: matching } : current
        })
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

  const loadExactReview = useCallback(
    async (reviewId: string, signal: AbortSignal) => {
      const generation = ++exactGeneration.current
      requestId.current += 1
      setIsLoading(false)
      setExactReview({ status: "loading" })
      try {
        const review = await commands.loadReview(reviewId, signal)
        if (generation !== exactGeneration.current || signal.aborted) return false
        if (review.id !== reviewId) {
          setExactReview({ status: "unavailable" })
          return false
        }
        requestId.current += 1
        setIsLoading(false)
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
        setDialog((current) => {
          if (current.kind === "closed" || current.review.id !== reviewId) return current
          if (current.kind === "history")
            return {
              ...current,
              review,
              history: undefined,
              isLoading: false,
              isLoadingOlder: false,
              error: "Review details changed. Reopen history to load the current record.",
            }
          return { ...current, review }
        })
        if (
          snapshot?.page.items.some(({ id }) => id === reviewId) ||
          review.publicMeasure === "removed" ||
          review.withdrawalState === "withdrawn"
        ) {
          setIsListStale(true)
          setStatusMessage("Review list needs refresh.")
        }
        setExactReview({ status: "ready", review })
        return true
      } catch (error) {
        if (generation === exactGeneration.current && !signal.aborted) {
          setExactReview({ status: "unavailable" })
          if (error instanceof ReviewSourceCommandError && error.kind === "not-found") {
            requestId.current += 1
            setIsLoading(false)
            setSnapshot((current) =>
              current
                ? {
                    ...current,
                    page: { ...current.page, items: current.page.items.filter(({ id }) => id !== reviewId) },
                  }
                : current,
            )
            setDialog((current) =>
              current.kind !== "closed" && current.review.id === reviewId ? { kind: "closed" } : current,
            )
            setIsListStale(true)
            setStatusMessage("Review list needs refresh.")
          }
          if (
            error instanceof ReviewSourceCommandError &&
            (error.kind === "unauthorized" || error.kind === "forbidden")
          ) {
            setSnapshot(undefined)
            setDialog({ kind: "closed" })
            setIsListStale(false)
            onSessionLost?.()
          }
        }
        return false
      }
    },
    [commands, onSessionLost, snapshot],
  )
  const cancelExactReviewRead = useCallback(() => {
    exactGeneration.current += 1
    setExactReview((current) => (current?.status === "loading" ? undefined : current))
  }, [])
  const closeExactReview = useCallback(() => {
    exactGeneration.current += 1
    setExactReview(undefined)
  }, [])
  const findReview = (reviewId: string) =>
    (exactReview?.status === "ready" && exactReview.review.id === reviewId
      ? exactReview.review
      : undefined) ?? snapshot?.page.items.find(({ id }) => id === reviewId)
  const replaceReview = (reviewId: string, review: NonNullable<ReturnType<typeof findReview>>) => {
    setExactReview((current) =>
      current?.status === "ready" && current.review.id === reviewId ? { status: "ready", review } : current,
    )
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
    cancelExactReviewRead,
    closeExactReview,
    loadExactReview,
    model: {
      exactReview,
      dialog,
      filters: {
        draft: draftFilters,
        isDirty: JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters),
        isMobileOpen,
        treatmentOptions: snapshot?.treatments ?? [],
      },
      isLoading,
      isListStale,
      list: snapshot?.page,
      showManagement,
      statusMessage,
      summary: isListStale ? undefined : snapshot?.summary,
    },
  }
}
