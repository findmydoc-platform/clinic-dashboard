"use client"
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useEffectEvent } from "react"
import {
  nextNotificationExpiry,
  notificationRetryAt,
  visibleNotificationItems,
  type NotificationDestinationOpen,
  type NotificationOpeningState,
  type NotificationItem,
  type NotificationCommands,
  type NotificationLoadState,
  type NotificationView,
  type NotificationMarkState,
  type NotificationPaginationState,
} from "../model/notifications"

const transientErrors = ["SERVICE_UNAVAILABLE", "SERVICE_TIMEOUT", "RATE_LIMITED"] as const
const accessErrors = ["UNAUTHENTICATED", "CLINIC_ACCESS_DENIED", "CONTENT_ACCESS_DENIED"] as const
const retryDelays = [5_000, 10_000, 20_000, 30_000] as const
const isTransient = (error: string) => transientErrors.some((value) => value === error)
const isAccessLoss = (error: string) => accessErrors.some((value) => value === error)

export function useNotificationCenterController(
  commands: NotificationCommands,
  initialState: NotificationLoadState,
  open: boolean,
  onDestinationOpen?: NotificationDestinationOpen,
  context?: Readonly<{ principalId: string; clinicId: string; enabled?: boolean }>,
) {
  const enabled = context?.enabled !== false
  const principalId = context?.principalId ?? "isolated"
  const clinicId = context?.clinicId ?? "isolated"
  const owner = `${principalId}:${clinicId}`
  const previousOwner = useRef(owner)
  const markGeneration = useRef(0)
  const intentionalOpening = useRef<Readonly<{ principalId: string; clinicId: string }> | undefined>(
    undefined,
  )
  const blockAutomaticReads = useRef(false)
  const knownAccessLoss = useRef(false)
  const generation = useRef(0)
  const refreshPending = useRef(false)
  const refreshFollowUp = useRef(false)
  const refreshAbort = useRef<AbortController | undefined>(undefined)
  const failures = useRef(0)
  const pending = useRef(false)
  const openingAbort = useRef<AbortController | undefined>(undefined)
  const paginationAbort = useRef<AbortController | undefined>(undefined)
  const paginationPending = useRef(false)
  const [openingKind, setOpeningKind] = useState<NotificationItem["destination"]["kind"]>()
  const [openingId, setOpeningId] = useState<string>()
  const [opening, setOpening] = useState<NotificationOpeningState>("idle")
  const mounted = useRef(true)
  const [marking, setMarking] = useState<NotificationMarkState>({ status: "idle" })
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    mounted.current = true
    return () => {
      openingAbort.current?.abort()
      paginationAbort.current?.abort()
      refreshAbort.current?.abort()
      mounted.current = false
      generation.current += 1
      markGeneration.current += 1
    }
  }, [])
  const retryAt = "retryAt" in marking ? marking.retryAt : undefined
  const readBlockedUntil = useRef<number | undefined>(undefined)
  useEffect(() => {
    readBlockedUntil.current = retryAt
  }, [retryAt])
  useEffect(() => {
    if (!retryAt || retryAt <= Date.now()) return
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(retryAt - Date.now(), 2_147_483_647))
    return () => window.clearTimeout(timer)
  }, [retryAt, now])
  const [view, setView] = useState<NotificationView>("unread")
  const [attempt, setAttempt] = useState(0)
  const [countState, setCountState] = useState(initialState)
  const [feed, setFeed] = useState<Readonly<{ view: NotificationView; state: NotificationLoadState }>>()
  const feedRef = useRef(feed)
  useEffect(() => {
    feedRef.current = feed
  }, [feed])
  const [refreshState, setRefreshState] = useState<"idle" | "updating" | "stale">("idle")
  const [readRetryAt, setReadRetryAt] = useState<number | undefined>()
  const [pagination, setPagination] = useState<NotificationPaginationState>({ status: "idle" })
  const pageRetryAt = pagination.status === "unavailable" ? pagination.retryAt : undefined
  useLayoutEffect(() => {
    if (previousOwner.current === owner) return
    previousOwner.current = owner
    generation.current += 1
    markGeneration.current += 1
    refreshAbort.current?.abort()
    paginationAbort.current?.abort()
    refreshPending.current = false
    refreshFollowUp.current = false
    paginationPending.current = false
    pending.current = false
    blockAutomaticReads.current = false
    knownAccessLoss.current = false
    readBlockedUntil.current = undefined
    failures.current = 0
    feedRef.current = undefined
    setFeed(undefined)
    setCountState({ status: "loading" })
    setMarking({ status: "idle" })
    setPagination({ status: "idle" })
    setReadRetryAt(undefined)
    setRefreshState("idle")
    const intentional = intentionalOpening.current
    if (!intentional || intentional.principalId !== principalId || intentional.clinicId !== clinicId) {
      openingAbort.current?.abort()
      intentionalOpening.current = undefined
      setOpening("cancelled")
    }
  }, [owner, principalId, clinicId])
  useEffect(() => {
    if (!pageRetryAt || pageRetryAt <= Date.now()) return
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.min(pageRetryAt - Date.now(), 2_147_483_647),
    )
    return () => window.clearTimeout(timer)
  }, [pageRetryAt, now])
  useEffect(() => {
    if (
      !enabled ||
      pending.current ||
      blockAutomaticReads.current ||
      !navigator.onLine ||
      document.visibilityState !== "visible"
    )
      return
    if (readBlockedUntil.current !== undefined && readBlockedUntil.current > Date.now()) return
    const abort = new AbortController()
    const timeout = AbortSignal.timeout(8_000)
    const signal = AbortSignal.any([abort.signal, timeout])
    const currentGeneration = ++generation.current
    refreshAbort.current = abort
    refreshPending.current = true
    paginationAbort.current?.abort()
    paginationPending.current = false
    const previous = feedRef.current?.view === view ? feedRef.current : undefined
    const previousItems =
      previous?.state.status === "ready" && previous.state.response.mode === "page"
        ? visibleNotificationItems(previous.state.response.items, Date.now())
        : []
    const previousTail = previousItems.at(-1)
    setRefreshState("updating")
    setPagination({ status: "idle" })
    async function read(query: Parameters<NotificationCommands["load"]>[0]) {
      return new Promise<Awaited<ReturnType<NotificationCommands["load"]>>>((resolve) => {
        let settled = false
        const finish = (result: Awaited<ReturnType<NotificationCommands["load"]>>) => {
          if (settled) return
          settled = true
          signal.removeEventListener("abort", cancelled)
          resolve(result)
        }
        const cancelled = () =>
          finish({ ok: false, error: timeout.aborted ? "SERVICE_TIMEOUT" : "SERVICE_UNAVAILABLE" })
        signal.addEventListener("abort", cancelled, { once: true })
        if (signal.aborted) return cancelled()
        void Promise.resolve()
          .then(() => commands.load(query, signal))
          .then(finish, () => finish({ ok: false, error: "SERVICE_UNAVAILABLE" }))
      })
    }
    async function refresh() {
      for (let restart = 0; restart < 2; restart += 1) {
        const first = await read(open ? { mode: "page", view } : { mode: "summary" })
        if (!first.ok) return first
        if (!open) {
          if (first.value.mode !== "summary")
            return { ok: false as const, error: "CONTRACT_INCOMPATIBLE" as const }
          return first
        }
        if (first.value.mode !== "page" || first.value.view !== view || !("unreadCount" in first.value))
          return { ok: false as const, error: "CONTRACT_INCOMPATIBLE" as const }
        const items = [...first.value.items]
        const ids = new Set(items.map((item) => item.presentationId))
        const cursors = new Set<string>()
        let cursor = first.value.nextCursor
        let cursorInvalid = false
        while (previousTail && cursor) {
          const tail = items.at(-1)
          if (
            items.some((item) => item.presentationId === previousTail.presentationId) ||
            (tail && tail.members.at(-1)!.occurredAt < previousTail.members.at(-1)!.occurredAt)
          )
            break
          if (cursors.has(cursor)) return { ok: false as const, error: "CONTRACT_INCOMPATIBLE" as const }
          cursors.add(cursor)
          const next = await read({ mode: "page", view, cursor })
          if (!next.ok) {
            if (next.error === "CURSOR_INVALID" && restart === 0) {
              cursorInvalid = true
              break
            }
            return next
          }
          if (next.value.mode !== "page" || next.value.view !== view || "unreadCount" in next.value)
            return { ok: false as const, error: "CONTRACT_INCOMPATIBLE" as const }
          for (const item of next.value.items) {
            if (ids.has(item.presentationId))
              return { ok: false as const, error: "CONTRACT_INCOMPATIBLE" as const }
            ids.add(item.presentationId)
            items.push(item)
          }
          cursor = next.value.nextCursor
        }
        if (cursorInvalid) continue
        return { ok: true as const, value: { ...first.value, items, nextCursor: cursor } }
      }
      return { ok: false as const, error: "CURSOR_INVALID" as const }
    }
    void refresh()
      .then((result) => {
        if (abort.signal.aborted || currentGeneration !== generation.current) return
        if (result.ok) {
          knownAccessLoss.current = false
          failures.current = 0
          readBlockedUntil.current = undefined
          setReadRetryAt(undefined)
          setRefreshState("idle")
          const state: NotificationLoadState = { status: "ready", response: result.value }
          if ("unreadCount" in result.value) setCountState(state)
          if (open && result.value.mode === "page") setFeed({ view, state })
          setMarking((current) =>
            current.status === "refresh-failed" ? { ...current, status: "confirmed" } : current,
          )
        } else {
          const error = result.error
          const unavailable: NotificationLoadState = { status: "unavailable", error }
          if (isAccessLoss(error) || error === "CONTRACT_INCOMPATIBLE") {
            blockAutomaticReads.current = true
            refreshFollowUp.current = false
            knownAccessLoss.current = isAccessLoss(error)
            markGeneration.current += 1
            pending.current = false
            setCountState(unavailable)
            setFeed(open ? { view, state: unavailable } : undefined)
            openingAbort.current?.abort()
            setOpening("cancelled")
            if (isAccessLoss(error)) setMarking({ status: "idle" })
            setRefreshState("idle")
          } else {
            setRefreshState("stale")
            if (open && (!previous || previous.state.status !== "ready"))
              setFeed({ view, state: unavailable })
            setCountState((current) => (current.status === "ready" ? current : unavailable))
            if (isTransient(error)) {
              const delay = retryDelays[Math.min(failures.current, retryDelays.length - 1)]
              failures.current += 1
              const throttledUntil = notificationRetryAt(result.retryAfter, Date.now()) ?? 0
              const next = Math.max(Date.now() + delay, throttledUntil)
              readBlockedUntil.current = next
              setReadRetryAt(next)
            }
          }
          setMarking((current) =>
            current.status === "confirmed" || current.status === "refresh-failed"
              ? { ...current, status: "refresh-failed" }
              : current,
          )
        }
      })
      .finally(() => {
        if (refreshAbort.current === abort) refreshAbort.current = undefined
        if (currentGeneration === generation.current) {
          refreshPending.current = false
          if (refreshFollowUp.current) {
            refreshFollowUp.current = false
            setAttempt((current) => current + 1)
          }
        }
      })
    return () => {
      abort.abort()
      if (refreshAbort.current === abort) refreshAbort.current = undefined
      refreshPending.current = false
    }
  }, [attempt, commands, open, view, owner, enabled])
  const automaticRefresh = useEffectEvent(() => {
    if (
      !enabled ||
      pending.current ||
      blockAutomaticReads.current ||
      (readBlockedUntil.current !== undefined && readBlockedUntil.current > Date.now()) ||
      document.visibilityState !== "visible" ||
      !navigator.onLine
    )
      return
    if (refreshPending.current) refreshFollowUp.current = true
    else setAttempt((current) => current + 1)
  })
  useEffect(() => {
    const refresh = () => automaticRefresh()
    const resume = () => {
      setNow(Date.now())
      refresh()
    }
    const timer = window.setInterval(refresh, 30_000)
    document.addEventListener("visibilitychange", resume)
    window.addEventListener("online", resume)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", resume)
      window.removeEventListener("online", resume)
    }
  }, [])
  useEffect(() => {
    if (readRetryAt === undefined) return
    const timer = window.setTimeout(
      () => {
        setNow(Date.now())
        automaticRefresh()
      },
      Math.max(0, readRetryAt - Date.now()) + 1,
    )
    return () => window.clearTimeout(timer)
  }, [readRetryAt])
  const countDeadline =
    countState.status === "ready" && "nextUnreadCountChangeAt" in countState.response
      ? countState.response.nextUnreadCountChangeAt
      : null
  const nextExpiry =
    feed?.state.status === "ready" && feed.state.response.mode === "page"
      ? nextNotificationExpiry(feed.state.response.items, now)
      : undefined
  const lastCountDeadline = useRef<string | null>(null)
  useEffect(() => {
    const deadline = countDeadline ? Date.parse(countDeadline) : undefined
    const pendingDeadline = lastCountDeadline.current === countDeadline ? undefined : deadline
    const wakeAt = Math.min(nextExpiry ?? Infinity, pendingDeadline ?? Infinity)
    if (!Number.isFinite(wakeAt)) return
    const timer = window.setTimeout(
      () => {
        setNow(Date.now())
        if (deadline !== undefined && deadline <= Date.now() && lastCountDeadline.current !== countDeadline) {
          lastCountDeadline.current = countDeadline
          automaticRefresh()
        }
      },
      Math.min(Math.max(0, wakeAt - Date.now()), 2_147_483_647),
    )
    return () => window.clearTimeout(timer)
  }, [countDeadline, nextExpiry, now])
  const state: NotificationLoadState =
    feed?.view === view
      ? feed.state.status === "ready" && feed.state.response.mode === "page"
        ? {
            status: "ready",
            response: {
              ...feed.state.response,
              items: visibleNotificationItems(feed.state.response.items, now),
            },
          }
        : feed.state
      : { status: "loading" }
  const unreadCount =
    countState.status === "ready" &&
    "unreadCount" in countState.response &&
    (!countDeadline || Date.parse(countDeadline) > now)
      ? countState.response.unreadCount
      : undefined
  async function markRead(notificationIds: readonly string[], fromOpening = false) {
    if (knownAccessLoss.current || pending.current || (retryAt !== undefined && retryAt > Date.now())) return
    if (!fromOpening) setOpening("idle")
    const selection = Object.freeze([...notificationIds])
    pending.current = true
    const actionGeneration = ++markGeneration.current
    generation.current += 1
    refreshAbort.current?.abort()
    refreshPending.current = false
    paginationAbort.current?.abort()
    paginationPending.current = false
    setPagination({ status: "idle" })
    setMarking({ status: "pending", notificationIds: selection })
    let result
    try {
      result = await commands.markRead({ notificationIds: selection })
    } catch {
      result = { ok: false as const, error: "SERVICE_UNAVAILABLE" as const, writeOutcome: "unknown" as const }
    }
    if (!mounted.current || actionGeneration !== markGeneration.current) return
    pending.current = false
    if (result.ok) {
      setMarking({ status: "confirmed", notificationIds: selection })
      setAttempt((current) => current + 1)
    } else {
      setMarking({
        status: result.writeOutcome === "not_committed" ? "rejected" : "unknown",
        notificationIds: selection,
        error: result.error,
        retryAt: notificationRetryAt(result.retryAfter, Date.now()),
      })
      setNow(Date.now())
    }
  }
  async function openItem(item: NotificationItem) {
    if (
      !onDestinationOpen ||
      knownAccessLoss.current ||
      pending.current ||
      (retryAt !== undefined && retryAt > Date.now())
    )
      return
    openingAbort.current?.abort()
    const abort = new AbortController()
    openingAbort.current = abort
    intentionalOpening.current = { principalId, clinicId: item.clinic.id }
    const selection = Object.freeze(item.members.map((member) => member.notificationId))
    const requestId = crypto.randomUUID()
    setOpeningKind(item.destination.kind)
    setOpeningId(requestId)
    setOpening("pending")
    setMarking({ status: "idle" })
    let outcome
    try {
      outcome = await onDestinationOpen(
        { requestId, clinicId: item.clinic.id, destination: item.destination },
        abort.signal,
      )
    } catch {
      outcome = "unavailable" as const
    }
    if (abort.signal.aborted || !mounted.current || openingAbort.current !== abort) return
    intentionalOpening.current = undefined
    setOpening(outcome)
    if (outcome === "displayed") await markRead(selection, true)
  }
  async function loadMore() {
    if (
      paginationPending.current ||
      pending.current ||
      refreshPending.current ||
      !open ||
      pagination.status === "loading" ||
      (pagination.status === "unavailable" &&
        pagination.retryAt !== undefined &&
        pagination.retryAt > Date.now()) ||
      feed?.view !== view ||
      feed.state.status !== "ready" ||
      feed.state.response.mode !== "page" ||
      !feed.state.response.nextCursor
    )
      return
    const cursor = feed.state.response.nextCursor
    const currentGeneration = generation.current
    const abort = new AbortController()
    paginationAbort.current?.abort()
    paginationAbort.current = abort
    paginationPending.current = true
    setPagination({ status: "loading" })
    let result
    try {
      result = await commands.load({ mode: "page", view, cursor }, abort.signal)
    } catch {
      result = { ok: false as const, error: "SERVICE_UNAVAILABLE" as const }
    }
    if (paginationAbort.current === abort) {
      paginationAbort.current = undefined
      paginationPending.current = false
    }
    if (abort.signal.aborted || !mounted.current || currentGeneration !== generation.current) return
    if (!result.ok) {
      if (result.error === "CURSOR_INVALID") {
        setPagination({ status: "loading" })
        setAttempt((current) => current + 1)
        return
      }
      if (isAccessLoss(result.error)) {
        blockAutomaticReads.current = true
        knownAccessLoss.current = true
        markGeneration.current += 1
        pending.current = false
        openingAbort.current?.abort()
        setOpening("cancelled")
        refreshFollowUp.current = false
        setCountState({ status: "unavailable", error: result.error })
        setFeed({ view, state: { status: "unavailable", error: result.error } })
        setMarking({ status: "idle" })
        setPagination({ status: "idle" })
        return
      }
      if (result.error === "CONTRACT_INCOMPATIBLE") blockAutomaticReads.current = true
      const retryAt = notificationRetryAt(result.retryAfter, Date.now())
      if (retryAt !== undefined && retryAt > Date.now()) {
        readBlockedUntil.current = Math.max(readBlockedUntil.current ?? 0, retryAt)
        setReadRetryAt(readBlockedUntil.current)
      }
      setPagination({
        status: "unavailable",
        error: result.error,
        retryAt,
      })
      return
    }
    if (
      result.value.mode !== "page" ||
      result.value.view !== view ||
      "unreadCount" in result.value ||
      result.value.nextCursor === cursor ||
      (result.value.items.length === 0 && result.value.nextCursor !== null)
    ) {
      blockAutomaticReads.current = true
      setPagination({ status: "unavailable", error: "CONTRACT_INCOMPATIBLE" })
      return
    }
    const page = result.value
    setFeed((current) => {
      if (
        current?.view !== view ||
        current.state.status !== "ready" ||
        current.state.response.mode !== "page" ||
        current.state.response.nextCursor !== cursor
      )
        return current
      const seen = new Set(current.state.response.items.map((item) => item.presentationId))
      const older = page.items.filter((item) => !seen.has(item.presentationId))
      return {
        ...current,
        state: {
          status: "ready",
          response: {
            ...current.state.response,
            serverTime: page.serverTime,
            items: [...current.state.response.items, ...older],
            nextCursor: page.nextCursor,
          },
        },
      }
    })
    setPagination({ status: "idle" })
  }
  function invalidatePagination() {
    generation.current += 1
    paginationAbort.current?.abort()
    paginationPending.current = false
    setPagination({ status: "idle" })
  }
  const cancelOpening = useCallback(() => {
    openingAbort.current?.abort()
    intentionalOpening.current = undefined
    markGeneration.current += 1
    pending.current = false
    setMarking({ status: "idle" })
    setOpening("cancelled")
  }, [])
  return {
    model: {
      state,
      unreadCount,
      view,
      marking,
      opening,
      openingId,
      openingKind,
      isRetryBlocked: retryAt !== undefined && retryAt > now,
      isReadRetryBlocked: readRetryAt !== undefined && readRetryAt > now,
      refreshState,
      pagination,
      isPageRetryBlocked: pageRetryAt !== undefined && pageRetryAt > now,
    },
    actions: {
      cancelOpening,
      openItem: onDestinationOpen ? openItem : undefined,
      selectView: (next: NotificationView) => {
        blockAutomaticReads.current = false
        invalidatePagination()
        setView(next)
      },
      retry: () => {
        if (
          (retryAt !== undefined && retryAt > Date.now()) ||
          (readRetryAt !== undefined && readRetryAt > Date.now())
        )
          return
        blockAutomaticReads.current = false
        invalidatePagination()
        setAttempt((current) => current + 1)
      },
      loadMore,
      markRead,
      repeatMark: () => {
        if (marking.status === "rejected" || marking.status === "unknown")
          void markRead(marking.notificationIds)
      },
    },
  }
}
