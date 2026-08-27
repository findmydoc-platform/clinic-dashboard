"use client"

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react"
import type { ClinicDashboardReauthenticationCommand } from "@/features/clinic-dashboard/auth/public"
import { createInquiryAttachmentAccessPaths } from "../browser/inquiry-attachment-paths"
import type { InquiryWorkspaceCommands } from "../model/inquiry-status-commands"
import type {
  InquiryAttachmentDraft,
  InquiryComposerMode,
  InquiryPrimaryFilter,
  InquiryWorkspaceActions,
  InquiryWorkspaceViewModel,
} from "../model/inquiry-workspace"
import {
  canReplyToInquiry,
  getInquiryHandlingStatusTargets,
  type InquiryHandlingStatus,
  type InquiryQueueQuery,
  type InquiryResult,
  type PatientInquiryDetail,
  type PatientInquiryQueueSnapshot,
} from "../model/inquiries"
import {
  createInquiryQueueState,
  hasUnsavedInquiryDrafts,
  inquiryQueueReducer,
} from "../model/inquiry-queue.reducer"
import { selectInquiryQueueViewModel } from "../model/inquiry-queue.selectors"

const POLLING_INTERVAL_MS = 15_000
const MAX_MESSAGE_CHARACTERS = 3_000
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
const acceptedAttachmentTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"])

type UseInquiryQueueControllerInput = Readonly<{
  commands: InquiryWorkspaceCommands
  isActive?: boolean
  onSessionLost?: (inquiryId?: string) => void
  reauthenticateSession?: ClinicDashboardReauthenticationCommand
  snapshot: PatientInquiryQueueSnapshot
}>

const reauthenticationUnavailable: ClinicDashboardReauthenticationCommand = async () => ({
  status: "temporarily-unavailable",
})

function errorMessage(code: string) {
  if (code === "unauthorized") return "Your session ended. Sign in again to continue."
  if (code === "access-denied" || code === "not-found") {
    return "This inquiry is no longer available to your clinic."
  }
  if (code === "conflict") return "This inquiry changed. Review the current state and decide again."
  if (code === "invalid-state") return "The action is no longer allowed in the current inquiry state."
  if (code === "payload-too-large") return "The attachment is larger than 5 MB."
  if (code === "unsupported-media-type") return "Use a PNG, JPEG, WebP or PDF file."
  if (code === "rate-limited") return "Too many requests. Wait briefly and try again."
  if (code === "service-timeout") {
    return "The result is uncertain. The latest activity was loaded before you retry."
  }
  if (code === "reauthentication-required") {
    return "Confirm your identity again before revealing protected contact details."
  }
  if (code === "invalid-input") return "Check the input and try again."
  return "The inquiry service is temporarily unavailable."
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function queryFromFilters(
  primary: InquiryPrimaryFilter,
  handlingStatuses: readonly Exclude<InquiryHandlingStatus, "spam">[],
  query: string,
): InquiryQueueQuery {
  const lifecycle = primary === "open" ? "open" : primary === "closed" ? "closed" : "all"
  const primaryStatuses =
    primary === "spam"
      ? (["spam"] as const)
      : primary === "closed"
        ? (["submitted", "in_review", "contacted"] as const)
        : undefined
  const effectiveStatuses =
    primary === "spam" ? primaryStatuses : handlingStatuses.length > 0 ? handlingStatuses : primaryStatuses
  return {
    ...(effectiveStatuses ? { handlingStatus: effectiveStatuses } : {}),
    ...(query.trim() ? { query: query.trim() } : {}),
    lifecycle,
    unreadOnly: primary === "unread",
  }
}

function latestVisibleActivityId(inquiry: PatientInquiryDetail) {
  return inquiry.timeline.at(-1)?.id
}

export function useInquiryQueueController({
  commands,
  isActive = true,
  onSessionLost,
  reauthenticateSession = reauthenticationUnavailable,
  snapshot,
}: UseInquiryQueueControllerInput): Readonly<{
  actions: InquiryWorkspaceActions
  model: InquiryWorkspaceViewModel
}> {
  const [state, dispatch] = useReducer(inquiryQueueReducer, snapshot, createInquiryQueueState)
  const isMountedRef = useRef(true)
  const loadedInquiryIdsRef = useRef(new Set(snapshot.inquiries.map(({ id }) => id)))
  const loadedPageCountRef = useRef(1)
  const pendingKeysRef = useRef(new Map<string, string>())
  const readyAttachmentDraftsRef = useRef(new Map<string, InquiryAttachmentDraft>())
  const failedAttachmentFilesRef = useRef(new Map<string, File>())
  const detailRequestGenerationRef = useRef(0)
  const automaticReadInFlightRef = useRef<string | undefined>(undefined)
  const automaticReadIntentRef = useRef<string | undefined>(undefined)
  const isWorkspaceActiveRef = useRef(isActive)
  const wasWorkspaceActiveRef = useRef(isActive)
  const terminalAccessLossRef = useRef(false)
  const selectedInquiryIdRef = useRef<string | undefined>(undefined)
  const uploadGenerationRef = useRef(new Map<string, number>())
  const model = selectInquiryQueueViewModel(state)
  const attachmentAccessPaths = useMemo(
    () =>
      Object.fromEntries(
        (model.selectedInquiry?.timeline ?? []).flatMap((item) =>
          item.kind === "external-message" && item.attachment
            ? [[item.attachment.id, createInquiryAttachmentAccessPaths(item.attachment.id)] as const]
            : [],
        ),
      ),
    [model.selectedInquiry],
  )

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    isWorkspaceActiveRef.current = isActive
    if (isActive && !wasWorkspaceActiveRef.current && selectedInquiryIdRef.current) {
      automaticReadIntentRef.current = selectedInquiryIdRef.current
    }
    wasWorkspaceActiveRef.current = isActive
  }, [isActive])

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedInquiryDrafts(state)) return
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [state])

  const invalidateInquiryRuntime = useCallback((inquiryId: string) => {
    uploadGenerationRef.current.set(inquiryId, (uploadGenerationRef.current.get(inquiryId) ?? 0) + 1)
    readyAttachmentDraftsRef.current.delete(inquiryId)
    failedAttachmentFilesRef.current.delete(inquiryId)
    for (const signature of pendingKeysRef.current.keys()) {
      if (signature.startsWith(`${inquiryId}:`)) pendingKeysRef.current.delete(signature)
    }
  }, [])

  const endSession = useCallback(() => {
    if (terminalAccessLossRef.current) return
    const inquiryId = selectedInquiryIdRef.current
    selectedInquiryIdRef.current = undefined
    dispatch({ message: errorMessage("unauthorized"), type: "sessionLost" })
    pendingKeysRef.current.clear()
    readyAttachmentDraftsRef.current.clear()
    failedAttachmentFilesRef.current.clear()
    terminalAccessLossRef.current = true
    uploadGenerationRef.current.clear()
    onSessionLost?.(inquiryId)
  }, [onSessionLost])

  const applySessionLoss = useCallback(
    (result: InquiryResult<unknown>) => {
      if (!result.ok && result.error.code === "unauthorized") {
        endSession()
        return true
      }
      return false
    },
    [endSession],
  )

  const applyInquiryAccessLoss = useCallback(
    (result: InquiryResult<unknown>, inquiryId: string) => {
      if (result.ok) return false
      if (result.error.code === "access-denied") {
        selectedInquiryIdRef.current = undefined
        pendingKeysRef.current.clear()
        readyAttachmentDraftsRef.current.clear()
        failedAttachmentFilesRef.current.clear()
        terminalAccessLossRef.current = true
        uploadGenerationRef.current.clear()
        dispatch({
          message: "Your role no longer grants access to patient inquiries.",
          type: "workspaceAccessLost",
        })
        return true
      }
      if (result.error.code === "not-found") {
        if (selectedInquiryIdRef.current === inquiryId) selectedInquiryIdRef.current = undefined
        invalidateInquiryRuntime(inquiryId)
        dispatch({ inquiryId, message: errorMessage(result.error.code), type: "inquiryAccessLost" })
        return true
      }
      return false
    },
    [invalidateInquiryRuntime],
  )

  const discardAttachmentBestEffort = useCallback(
    (inquiryId: string, draftId: string) => {
      try {
        void commands
          .discardAttachmentDraft({ draftId, inquiryId })
          .then((result) => {
            if (!isMountedRef.current || applySessionLoss(result)) return
            applyInquiryAccessLoss(result, inquiryId)
          })
          .catch(() => undefined)
      } catch {
        // The original action remains authoritative even if cleanup cannot be scheduled.
      }
    },
    [applyInquiryAccessLoss, applySessionLoss, commands],
  )

  const discardUnboundReplyAttachment = useCallback(
    (inquiryId: string) => {
      const attachment = readyAttachmentDraftsRef.current.get(inquiryId)
      invalidateInquiryRuntime(inquiryId)
      if (attachment) discardAttachmentBestEffort(inquiryId, attachment.draftId)
    },
    [discardAttachmentBestEffort, invalidateInquiryRuntime],
  )

  const loadQueuePage = useCallback(
    async (
      input: Readonly<{
        cursor?: string
        foreground?: boolean
        mode: "append" | "refresh" | "replace"
      }> = {
        mode: "refresh",
      },
    ) => {
      if (input.foreground) dispatch({ type: "queueLoadStarted" })
      const query = queryFromFilters(state.lifecycleFilter, state.handlingStatusFilter, state.searchQuery)
      if (input.mode === "refresh" && loadedPageCountRef.current > 1) {
        const firstPageResult = await commands.loadQueue({
          ...query,
          ...(state.firstPageChangeCursor ? { knownChangeCursor: state.firstPageChangeCursor } : {}),
        })
        if (!isMountedRef.current || applySessionLoss(firstPageResult)) return firstPageResult
        if (!firstPageResult.ok && firstPageResult.error.code === "access-denied") {
          selectedInquiryIdRef.current = undefined
          terminalAccessLossRef.current = true
          pendingKeysRef.current.clear()
          readyAttachmentDraftsRef.current.clear()
          failedAttachmentFilesRef.current.clear()
          uploadGenerationRef.current.clear()
          dispatch({
            message: "Your role no longer grants access to patient inquiries.",
            type: "workspaceAccessLost",
          })
          return firstPageResult
        }
        if (!firstPageResult.ok || firstPageResult.value.status !== "ready") {
          if (input.foreground) dispatch({ type: "queueLoadFailed" })
          return firstPageResult
        }
        if (firstPageResult.value.unchanged) {
          dispatch({
            changeCursor: firstPageResult.value.changeCursor,
            type: "queueUnchanged",
            unreadCount: firstPageResult.value.unreadCount,
          })
          return firstPageResult
        }

        const inquiries = new Map<
          string,
          PatientInquiryDetail | PatientInquiryQueueSnapshot["inquiries"][number]
        >()
        for (const inquiry of firstPageResult.value.inquiries) inquiries.set(inquiry.id, inquiry)
        let cursor = firstPageResult.value.nextCursor
        let latestSnapshot = firstPageResult.value
        let loadedPages = 1
        const seenCursors = new Set<string>()
        const maximumRefreshPages = loadedPageCountRef.current + Math.max(1, loadedInquiryIdsRef.current.size)
        for (let page = 1; cursor && page < maximumRefreshPages; page += 1) {
          if (seenCursors.has(cursor)) {
            if (input.foreground) dispatch({ type: "queueLoadFailed" })
            return { error: { code: "service-unavailable" }, ok: false } as const
          }
          seenCursors.add(cursor)
          const pageResult = await commands.loadQueue({
            ...query,
            cursor,
          })
          if (!isMountedRef.current || applySessionLoss(pageResult)) return pageResult
          if (!pageResult.ok && pageResult.error.code === "access-denied") {
            selectedInquiryIdRef.current = undefined
            terminalAccessLossRef.current = true
            pendingKeysRef.current.clear()
            readyAttachmentDraftsRef.current.clear()
            failedAttachmentFilesRef.current.clear()
            uploadGenerationRef.current.clear()
            dispatch({
              message: "Your role no longer grants access to patient inquiries.",
              type: "workspaceAccessLost",
            })
            return pageResult
          }
          if (!pageResult.ok || pageResult.value.status !== "ready" || pageResult.value.unchanged) {
            if (input.foreground) dispatch({ type: "queueLoadFailed" })
            return pageResult
          }
          latestSnapshot = pageResult.value
          loadedPages += 1
          for (const inquiry of pageResult.value.inquiries) inquiries.set(inquiry.id, inquiry)
          cursor = pageResult.value.nextCursor
          const hasLoadedPreviousWindow = [...loadedInquiryIdsRef.current].every((id) => inquiries.has(id))
          if (!cursor || (loadedPages >= loadedPageCountRef.current && hasLoadedPreviousWindow)) {
            break
          }
        }
        if (cursor && ![...loadedInquiryIdsRef.current].every((id) => inquiries.has(id))) {
          if (input.foreground) dispatch({ type: "queueLoadFailed" })
          return { error: { code: "service-unavailable" }, ok: false } as const
        }
        const refreshedSnapshot = {
          changeCursor: firstPageResult.value.changeCursor,
          inquiries: [...inquiries.values()],
          ...(latestSnapshot.nextCursor ? { nextCursor: latestSnapshot.nextCursor } : {}),
          status: "ready",
          unchanged: false,
          unreadCount: firstPageResult.value.unreadCount,
        } as const
        loadedPageCountRef.current = Math.max(1, loadedPages)
        loadedInquiryIdsRef.current = new Set(refreshedSnapshot.inquiries.map(({ id }) => id))
        dispatch({ mode: "refresh", snapshot: refreshedSnapshot, type: "queueLoaded" })
        return { ok: true, value: refreshedSnapshot } as const
      }

      const result = await commands.loadQueue({
        ...query,
        ...(input.cursor ? { cursor: input.cursor } : {}),
        ...(input.mode === "refresh" && state.firstPageChangeCursor
          ? { knownChangeCursor: state.firstPageChangeCursor }
          : {}),
      })
      if (!isMountedRef.current || applySessionLoss(result)) return result
      if (!result.ok && result.error.code === "access-denied") {
        selectedInquiryIdRef.current = undefined
        terminalAccessLossRef.current = true
        pendingKeysRef.current.clear()
        readyAttachmentDraftsRef.current.clear()
        failedAttachmentFilesRef.current.clear()
        uploadGenerationRef.current.clear()
        dispatch({
          message: "Your role no longer grants access to patient inquiries.",
          type: "workspaceAccessLost",
        })
        return result
      }
      if (!result.ok || result.value.status !== "ready") {
        if (input.foreground) dispatch({ type: "queueLoadFailed" })
        return result
      }
      if (input.mode === "refresh" && result.value.unchanged) {
        dispatch({
          changeCursor: result.value.changeCursor,
          type: "queueUnchanged",
          unreadCount: result.value.unreadCount,
        })
        return result
      }
      if (input.mode === "append") {
        loadedPageCountRef.current += 1
        for (const inquiry of result.value.inquiries) loadedInquiryIdsRef.current.add(inquiry.id)
      }
      if (input.mode === "replace") {
        loadedPageCountRef.current = 1
        loadedInquiryIdsRef.current = new Set(result.value.inquiries.map(({ id }) => id))
      }
      dispatch({ mode: input.mode, snapshot: result.value, type: "queueLoaded" })
      return result
    },
    [
      applySessionLoss,
      commands,
      state.firstPageChangeCursor,
      state.handlingStatusFilter,
      state.lifecycleFilter,
      state.searchQuery,
    ],
  )

  const updateReadPosition = useCallback(
    async (inquiry: PatientInquiryDetail, mode: "read" | "unread", source: "automatic" | "manual") => {
      if (terminalAccessLossRef.current) return
      const result = await commands.changeReadPosition({
        ...(mode === "read" && latestVisibleActivityId(inquiry)
          ? { activityId: latestVisibleActivityId(inquiry) }
          : {}),
        inquiryId: inquiry.id,
        mode,
      })
      if (!isMountedRef.current || applySessionLoss(result)) return
      if (result.ok) {
        if (
          source === "automatic" &&
          (!isWorkspaceActiveRef.current ||
            document.visibilityState !== "visible" ||
            selectedInquiryIdRef.current !== inquiry.id)
        ) {
          return
        }
        dispatch({ inquiryId: inquiry.id, type: "readPositionChanged", unread: result.value.unread })
        return
      }
      if (applyInquiryAccessLoss(result, inquiry.id)) return
      if (source === "manual" && selectedInquiryIdRef.current === inquiry.id) {
        dispatch({ message: errorMessage(result.error.code), type: "mutationFailed" })
      }
    },
    [applyInquiryAccessLoss, applySessionLoss, commands],
  )

  const loadSelectedInquiry = useCallback(
    async (inquiryId: string, kind: "background" | "initial" | "manual") => {
      const requestGeneration = detailRequestGenerationRef.current + 1
      detailRequestGenerationRef.current = requestGeneration
      if (kind === "initial") automaticReadIntentRef.current = inquiryId
      const knownChangeCursor = kind === "initial" ? undefined : state.details[inquiryId]?.changeCursor
      if (kind === "initial") dispatch({ inquiryId, type: "inquiryLoadStarted" })
      if (kind === "manual") dispatch({ type: "refreshStarted" })

      const result = await commands.loadDetail({
        inquiryId,
        ...(knownChangeCursor === undefined ? {} : { knownChangeCursor }),
      })
      if (!isMountedRef.current || applySessionLoss(result)) return result
      if (requestGeneration !== detailRequestGenerationRef.current) return result
      if (!result.ok) {
        if (kind === "initial" && automaticReadIntentRef.current === inquiryId) {
          automaticReadIntentRef.current = undefined
        }
        if (applyInquiryAccessLoss(result, inquiryId)) return result
        if (kind !== "background") {
          const action =
            kind === "initial"
              ? ({ inquiryId, message: errorMessage(result.error.code), type: "inquiryLoadFailed" } as const)
              : ({ message: errorMessage(result.error.code), type: "refreshFailed" } as const)
          dispatch(action)
        }
        return result
      }

      if (kind === "background") {
        dispatch({ inquiry: result.value.inquiry, type: "backgroundRefreshSucceeded" })
      } else if (kind === "manual") {
        dispatch({ inquiry: result.value.inquiry, type: "refreshSucceeded" })
      } else {
        dispatch({ inquiry: result.value.inquiry, type: "inquiryLoadSucceeded" })
      }
      return result
    },
    [applyInquiryAccessLoss, applySessionLoss, commands, state.details],
  )

  useEffect(() => {
    const inquiry = model.selectedInquiry
    if (!isActive || !inquiry || automaticReadIntentRef.current !== inquiry.id) return
    if (document.visibilityState !== "visible") return
    automaticReadIntentRef.current = undefined
    if (!inquiry.unread.isUnread || !inquiry.actions.canMarkRead) return
    const activityId = latestVisibleActivityId(inquiry)
    const readKey = `${inquiry.id}:${activityId ?? inquiry.changeCursor}`
    if (automaticReadInFlightRef.current === readKey) return
    automaticReadInFlightRef.current = readKey
    void updateReadPosition(inquiry, "read", "automatic").finally(() => {
      if (automaticReadInFlightRef.current === readKey) automaticReadInFlightRef.current = undefined
    })
  }, [isActive, model.selectedInquiry, updateReadPosition])

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      await loadQueuePage({ foreground: true, mode: "replace" })
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [loadQueuePage])

  useEffect(() => {
    let inFlight = false
    const refreshQueueIfVisible = async () => {
      if (inFlight || document.visibilityState !== "visible" || !navigator.onLine) return
      inFlight = true
      await loadQueuePage({ mode: "refresh" })
      inFlight = false
    }
    const interval = window.setInterval(() => void refreshQueueIfVisible(), POLLING_INTERVAL_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshQueueIfVisible()
    }
    window.addEventListener("focus", refreshQueueIfVisible)
    window.addEventListener("online", refreshQueueIfVisible)
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", refreshQueueIfVisible)
      window.removeEventListener("online", refreshQueueIfVisible)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [loadQueuePage])

  useEffect(() => {
    const inquiry = model.selectedInquiry
    if (!isActive || !inquiry) return

    let inFlight = false
    const refreshIfVisible = async () => {
      if (inFlight || document.visibilityState !== "visible" || !navigator.onLine) return
      inFlight = true
      await loadSelectedInquiry(inquiry.id, "background")
      inFlight = false
    }
    const interval = window.setInterval(() => void refreshIfVisible(), POLLING_INTERVAL_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        automaticReadIntentRef.current = inquiry.id
        void refreshIfVisible()
      }
    }
    window.addEventListener("focus", refreshIfVisible)
    window.addEventListener("online", refreshIfVisible)
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", refreshIfVisible)
      window.removeEventListener("online", refreshIfVisible)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [isActive, loadSelectedInquiry, model.selectedInquiry])

  const runMutation = useCallback(
    async (
      signature: string,
      startMessage: string,
      invoke: (
        idempotencyKey: string,
      ) => Promise<InquiryResult<Readonly<{ inquiry: PatientInquiryDetail; replayed?: boolean }>>>,
      success: Readonly<{
        afterSuccess?: () => Promise<void> | void
        clearAttachment?: boolean
        clearDraftMode?: InquiryComposerMode
        message: string
      }>,
    ) => {
      if (state.isMutating || terminalAccessLossRef.current) return false
      const idempotencyKey = pendingKeysRef.current.get(signature) ?? createIdempotencyKey()
      pendingKeysRef.current.set(signature, idempotencyKey)
      dispatch({ message: startMessage, type: "mutationStarted" })
      const result = await invoke(idempotencyKey)
      if (!isMountedRef.current || applySessionLoss(result)) return false

      if (result.ok) {
        pendingKeysRef.current.delete(signature)
        const { afterSuccess, ...successAction } = success
        dispatch({
          ...successAction,
          inquiry: result.value.inquiry,
          type: "mutationSucceeded",
        })
        await afterSuccess?.()
        if (success.clearAttachment) readyAttachmentDraftsRef.current.delete(result.value.inquiry.id)
        await loadQueuePage({ mode: "refresh" })
        return true
      }

      const current = result.error.current
      const isConflict = result.error.code === "conflict" || result.error.code === "invalid-state"
      const resultIsAmbiguous =
        result.error.code === "service-timeout" || result.error.code === "service-unavailable"
      if (!resultIsAmbiguous) pendingKeysRef.current.delete(signature)
      if (resultIsAmbiguous && model.selectedInquiry) {
        await loadSelectedInquiry(model.selectedInquiry.id, "background")
      }
      if (model.selectedInquiry && applyInquiryAccessLoss(result, model.selectedInquiry.id)) return false
      dispatch({
        ...(current && isConflict ? { conflict: { current, message: errorMessage(result.error.code) } } : {}),
        message: errorMessage(result.error.code),
        type: "mutationFailed",
      })
      return false
    },
    [
      applySessionLoss,
      applyInquiryAccessLoss,
      loadQueuePage,
      loadSelectedInquiry,
      model.selectedInquiry,
      state.isMutating,
    ],
  )

  const actions = useMemo<InquiryWorkspaceActions>(() => {
    const selected = model.selectedInquiry
    const draft = model.draft

    const revealSelectedContact = async () => {
      if (
        terminalAccessLossRef.current ||
        !selected ||
        !selected.actions.canRevealContact ||
        selected.contact.state !== "masked"
      ) {
        return
      }
      dispatch({ message: "Rechecking access to protected contact details…", type: "mutationStarted" })
      const result = await commands.revealContact({ inquiryId: selected.id })
      if (!isMountedRef.current || applySessionLoss(result)) return
      if (result.ok) {
        dispatch({
          inquiry: result.value.inquiry,
          message: "Protected contact details revealed for read-only review.",
          type: "mutationSucceeded",
        })
        return
      }
      if (result.error.code === "reauthentication-required") {
        dispatch({
          contactReauthentication: {
            message: "Enter your current password to reveal protected contact details.",
            status: "required",
          },
          type: "contactReauthenticationRequired",
        })
        return
      }
      if (applyInquiryAccessLoss(result, selected.id)) return
      dispatch({ message: errorMessage(result.error.code), type: "mutationFailed" })
    }

    const selectAttachment = async (file: File) => {
      if (!selected || terminalAccessLossRef.current || model.activeComposerMode !== "reply") return
      const replacedAttachment =
        readyAttachmentDraftsRef.current.get(selected.id) ??
        (model.attachment?.status === "ready" ? model.attachment : undefined)
      const uploadGeneration = (uploadGenerationRef.current.get(selected.id) ?? 0) + 1
      uploadGenerationRef.current.set(selected.id, uploadGeneration)
      if (!acceptedAttachmentTypes.has(file.type) || file.size <= 0 || file.size > MAX_ATTACHMENT_BYTES) {
        readyAttachmentDraftsRef.current.delete(selected.id)
        failedAttachmentFilesRef.current.delete(selected.id)
        if (replacedAttachment) {
          discardAttachmentBestEffort(selected.id, replacedAttachment.draftId)
        }
        dispatch({
          attachment: {
            fileName: file.name,
            message:
              file.size > MAX_ATTACHMENT_BYTES
                ? "The attachment is larger than 5 MB."
                : "Use a PNG, JPEG, WebP or PDF file.",
            mimeType: file.type,
            sizeBytes: file.size,
            status: "invalid",
          },
          inquiryId: selected.id,
          type: "attachmentChanged",
        })
        return
      }
      failedAttachmentFilesRef.current.set(selected.id, file)
      dispatch({
        attachment: {
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          status: "uploading",
        },
        inquiryId: selected.id,
        type: "attachmentChanged",
      })
      const result = await commands.createAttachmentDraft({ file, inquiryId: selected.id })
      if (!isMountedRef.current || applySessionLoss(result)) return
      if (applyInquiryAccessLoss(result, selected.id)) return
      if (terminalAccessLossRef.current) {
        if (result.ok) discardAttachmentBestEffort(selected.id, result.value.draftId)
        return
      }
      if (uploadGenerationRef.current.get(selected.id) !== uploadGeneration) {
        if (result.ok) {
          const discarded = await commands.discardAttachmentDraft({
            draftId: result.value.draftId,
            inquiryId: selected.id,
          })
          if (!isMountedRef.current || applySessionLoss(discarded)) return
          applyInquiryAccessLoss(discarded, selected.id)
        }
        return
      }
      if (result.ok) {
        readyAttachmentDraftsRef.current.set(selected.id, result.value)
        failedAttachmentFilesRef.current.delete(selected.id)
        if (replacedAttachment && replacedAttachment.draftId !== result.value.draftId) {
          discardAttachmentBestEffort(selected.id, replacedAttachment.draftId)
        }
      } else {
        readyAttachmentDraftsRef.current.delete(selected.id)
        if (replacedAttachment) {
          discardAttachmentBestEffort(selected.id, replacedAttachment.draftId)
        }
      }
      dispatch({
        attachment: result.ok
          ? result.value
          : {
              fileName: file.name,
              message: errorMessage(result.error.code),
              mimeType: file.type,
              sizeBytes: file.size,
              status: "failed",
            },
        inquiryId: selected.id,
        type: "attachmentChanged",
      })
    }

    return {
      async onAttachmentRemove() {
        if (!selected || terminalAccessLossRef.current) return
        uploadGenerationRef.current.set(selected.id, (uploadGenerationRef.current.get(selected.id) ?? 0) + 1)
        const attachment =
          readyAttachmentDraftsRef.current.get(selected.id) ??
          (model.attachment?.status === "ready" ? model.attachment : undefined)
        readyAttachmentDraftsRef.current.delete(selected.id)
        failedAttachmentFilesRef.current.delete(selected.id)
        dispatch({ inquiryId: selected.id, type: "attachmentChanged" })
        if (attachment) {
          const discarded = await commands.discardAttachmentDraft({
            draftId: attachment.draftId,
            inquiryId: selected.id,
          })
          if (!isMountedRef.current || applySessionLoss(discarded)) return
          applyInquiryAccessLoss(discarded, selected.id)
        }
      },
      onAttachmentSelect: selectAttachment,
      async onAttachmentRetry() {
        if (!selected || model.attachment?.status !== "failed") return
        const file = failedAttachmentFilesRef.current.get(selected.id)
        if (file) await selectAttachment(file)
      },
      onComposerModeChange(mode) {
        if (!selected) return
        if (mode === "reply" && (!canReplyToInquiry(selected) || !selected.actions.canReply)) return
        dispatch({ mode, type: "composerModeChanged" })
      },
      onConflictDismiss() {
        dispatch({ type: "conflictDismissed" })
      },
      onReplyDraftConvertToNote() {
        if (!selected || !model.canConvertReplyDraftToNote) return
        dispatch({ inquiryId: selected.id, type: "replyDraftConvertedToNote" })
      },
      onDraftChange(value) {
        if (!selected) return
        dispatch({
          inquiryId: selected.id,
          mode: model.activeComposerMode,
          type: "draftChanged",
          value,
        })
      },
      async onHandlingStatusChange(status) {
        if (!selected || !selected.actions.canChangeHandlingStatus || selected.handlingStatus === status) {
          return
        }
        if (!getInquiryHandlingStatusTargets(selected.handlingStatus).some((target) => target === status)) {
          return
        }
        await runMutation(
          `${selected.id}:handling:${selected.revision}:${status}`,
          `Changing status to ${status}…`,
          () =>
            commands.changeState({
              action: "set-handling-status",
              expectedRevision: selected.revision,
              handlingStatus: status,
              inquiryId: selected.id,
            }),
          { message: "Inquiry status updated." },
        )
      },
      async onInquirySelect(inquiryId) {
        selectedInquiryIdRef.current = inquiryId
        await loadSelectedInquiry(inquiryId, "initial")
      },
      async onLifecycleToggle(input) {
        if (!selected || !selected.actions.canChangeLifecycle) return false
        const replyDraft = state.drafts[selected.id]?.reply ?? ""
        if (
          selected.lifecycle === "open" &&
          (replyDraft.length > 0 || Boolean(state.attachments[selected.id])) &&
          !input?.draftDiscardConfirmed
        ) {
          return false
        }
        const action = selected.lifecycle === "open" ? "close" : "reopen"
        return runMutation(
          `${selected.id}:lifecycle:${selected.revision}:${action}`,
          action === "close" ? "Closing conversation…" : "Reopening conversation…",
          () =>
            commands.changeState({
              action,
              expectedRevision: selected.revision,
              inquiryId: selected.id,
              ...(input?.reason ? { reason: input.reason } : {}),
            }),
          {
            ...(action === "close"
              ? {
                  afterSuccess: () => discardUnboundReplyAttachment(selected.id),
                  clearAttachment: true,
                  clearDraftMode: "reply" as const,
                }
              : {}),
            message: action === "close" ? "Conversation closed." : "Conversation reopened.",
          },
        )
      },
      async onMarkReadToggle() {
        if (
          !selected ||
          (selected.unread.isUnread ? !selected.actions.canMarkRead : !selected.actions.canMarkUnread)
        ) {
          return
        }
        await updateReadPosition(selected, selected.unread.isUnread ? "read" : "unread", "manual")
      },
      async onLoadMore() {
        if (!model.nextCursor || model.isLoadingQueue) return
        await loadQueuePage({ cursor: model.nextCursor, foreground: true, mode: "append" })
      },
      async onContactReveal() {
        await revealSelectedContact()
      },
      async onContactReauthenticate(password) {
        if (terminalAccessLossRef.current || !selected || !model.contactReauthentication || !password) return
        dispatch({ message: "Confirming your identity…", type: "mutationStarted" })
        const reauthentication = await reauthenticateSession(password)
        if (!isMountedRef.current) return
        if (reauthentication.status === "session-ended") {
          endSession()
          return
        }
        if (reauthentication.status !== "reauthenticated") {
          dispatch({
            contactReauthentication: {
              message:
                reauthentication.status === "invalid-credentials"
                  ? "The password was not accepted. Try again."
                  : "Fresh authentication is temporarily unavailable. Try again.",
              status: reauthentication.status === "invalid-credentials" ? "invalid" : "unavailable",
            },
            type: "contactReauthenticationRequired",
          })
          return
        }
        const refreshed = await loadSelectedInquiry(selected.id, "background")
        if (!refreshed?.ok) {
          if (
            refreshed?.error.code !== "access-denied" &&
            refreshed?.error.code !== "not-found" &&
            refreshed?.error.code !== "unauthorized"
          ) {
            dispatch({
              contactReauthentication: {
                message: "The refreshed session could not be verified. Try again.",
                status: "unavailable",
              },
              type: "contactReauthenticationRequired",
            })
          }
          return
        }
        await revealSelectedContact()
      },
      onContactReauthenticationDismiss() {
        dispatch({ type: "contactReauthenticationDismissed" })
      },
      onMobileBack() {
        dispatch({ type: "mobileInboxRequested" })
      },
      async onQueueRefresh() {
        await loadQueuePage({ foreground: true, mode: "refresh" })
      },
      async onRefresh() {
        await loadQueuePage({ foreground: true, mode: "refresh" })
        const inquiryId = selected?.id ?? state.selectedInquiryId
        if (inquiryId) {
          await loadSelectedInquiry(inquiryId, selected ? "manual" : "initial")
        }
      },
      onSearchQueryChange(query) {
        dispatch({ query, type: "searchQueryChanged" })
      },
      onStatusFilterChange(statuses) {
        dispatch({ statuses, type: "handlingStatusFilterChanged" })
      },
      onPrimaryFilterChange(filter) {
        dispatch({ filter, type: "primaryFilterChanged" })
      },
      async onSend() {
        if (!selected || draft.length > MAX_MESSAGE_CHARACTERS) return
        const attachment = model.attachment?.status === "ready" ? model.attachment : undefined
        if (!draft.trim() && !attachment) return

        if (model.activeComposerMode === "note") {
          if (!draft.trim() || !selected.actions.canAddInternalNote) return
          await runMutation(
            `${selected.id}:note:${draft}`,
            "Saving internal note…",
            (idempotencyKey) =>
              commands.addInternalNote({
                idempotencyKey,
                inquiryId: selected.id,
                text: draft,
              }),
            { clearDraftMode: "note", message: "Internal note added." },
          )
          return
        }

        if (!canReplyToInquiry(selected) || !selected.actions.canReply) return
        await runMutation(
          `${selected.id}:reply:${draft}:${attachment?.draftId ?? "none"}`,
          "Sending reply…",
          (idempotencyKey) =>
            commands.sendExternalMessage({
              ...(attachment ? { attachmentDraftId: attachment.draftId } : {}),
              expectedRevision: selected.revision,
              idempotencyKey,
              inquiryId: selected.id,
              ...(draft.trim() ? { text: draft } : {}),
            }),
          {
            clearAttachment: true,
            clearDraftMode: "reply",
            message: "Reply sent through findmydoc.",
          },
        )
      },
      async onSpamToggle(input) {
        if (!selected || !selected.actions.canChangeHandlingStatus) return false
        const markingSpam = selected.handlingStatus !== "spam"
        if (markingSpam && !selected.actions.canChangeLifecycle) return false
        const replyDraft = state.drafts[selected.id]?.reply ?? ""
        if (markingSpam && !input?.reason?.trim()) return false
        if (
          markingSpam &&
          (replyDraft.length > 0 || Boolean(state.attachments[selected.id])) &&
          !input?.draftDiscardConfirmed
        ) {
          return false
        }
        const action = markingSpam ? "mark-spam" : "remove-spam"
        return runMutation(
          `${selected.id}:spam:${selected.revision}:${action}:${input?.reason ?? ""}`,
          markingSpam ? "Marking inquiry as spam…" : "Removing spam label…",
          () =>
            commands.changeState({
              action,
              expectedRevision: selected.revision,
              inquiryId: selected.id,
              ...(input?.reason ? { reason: input.reason } : {}),
            }),
          {
            ...(markingSpam
              ? {
                  afterSuccess: () => discardUnboundReplyAttachment(selected.id),
                  clearAttachment: true,
                  clearDraftMode: "reply" as const,
                }
              : {}),
            message: markingSpam
              ? "Marked as Spam and conversation closed."
              : "Spam label removed. Conversation remains closed.",
          },
        )
      },
    }
  }, [
    applyInquiryAccessLoss,
    applySessionLoss,
    commands,
    discardAttachmentBestEffort,
    discardUnboundReplyAttachment,
    endSession,
    loadSelectedInquiry,
    loadQueuePage,
    model,
    reauthenticateSession,
    runMutation,
    state.attachments,
    state.drafts,
    state.selectedInquiryId,
    updateReadPosition,
  ])

  return { actions, model: { ...model, attachmentAccessPaths } }
}
