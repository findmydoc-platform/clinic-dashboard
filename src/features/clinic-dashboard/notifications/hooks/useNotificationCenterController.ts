"use client"
import { useEffect, useRef, useState, useEffectEvent } from "react"
import {
  notificationRetryAt,
  type NotificationDestinationOpen,
  type NotificationOpeningState,
  type NotificationItem,
  type NotificationCommands,
  type NotificationLoadState,
  type NotificationView,
  type NotificationMarkState,
} from "../model/notifications"

export function useNotificationCenterController(
  commands: NotificationCommands,
  initialState: NotificationLoadState,
  open: boolean,
  onDestinationOpen?: NotificationDestinationOpen,
) {
  const blockAutomaticReads = useRef(false)
  const generation = useRef(0)
  const pending = useRef(false)
  const openingAbort = useRef<AbortController | undefined>(undefined)
  const [openingId, setOpeningId] = useState<string>()
  const [opening, setOpening] = useState<NotificationOpeningState>("idle")
  const mounted = useRef(true)
  const [marking, setMarking] = useState<NotificationMarkState>({ status: "idle" })
  const hasConfirmedMark = useEffectEvent(
    () => marking.status === "confirmed" || marking.status === "refresh-failed",
  )
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    mounted.current = true
    return () => {
      openingAbort.current?.abort()
      mounted.current = false
      generation.current += 1
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
  const [feed, setFeed] =
    useState<Readonly<{ view: NotificationView; attempt: number; state: NotificationLoadState }>>()
  useEffect(() => {
    if (pending.current || (readBlockedUntil.current !== undefined && readBlockedUntil.current > Date.now()))
      return
    const abort = new AbortController()
    const currentGeneration = ++generation.current
    commands
      .load(open ? { mode: "page", view } : { mode: "summary" }, abort.signal)
      .then((result) => {
        if (abort.signal.aborted || currentGeneration !== generation.current) return
        const state: NotificationLoadState = result.ok
          ? { status: "ready", response: result.value }
          : { status: "unavailable", error: result.error }
        const preserveConfirmedFeed =
          hasConfirmedMark() &&
          !result.ok &&
          ["SERVICE_UNAVAILABLE", "SERVICE_TIMEOUT", "RATE_LIMITED"].includes(result.error)
        if (open)
          setFeed((current) => ({
            view,
            attempt,
            state:
              preserveConfirmedFeed && current?.view === view && current.state.status === "ready"
                ? current.state
                : state,
          }))
        if (result.ok && "unreadCount" in result.value) setCountState(state)
        setMarking((current) =>
          current.status === "confirmed" || current.status === "refresh-failed"
            ? { ...current, status: result.ok ? "confirmed" : "refresh-failed" }
            : current,
        )
        if (
          !result.ok &&
          [
            "CONTRACT_INCOMPATIBLE",
            "UNAUTHENTICATED",
            "CLINIC_ACCESS_DENIED",
            "CONTENT_ACCESS_DENIED",
          ].includes(result.error)
        )
          blockAutomaticReads.current = true
        if (
          !result.ok &&
          ["UNAUTHENTICATED", "CLINIC_ACCESS_DENIED", "CONTENT_ACCESS_DENIED"].includes(result.error)
        ) {
          openingAbort.current?.abort()
          setOpening("cancelled")
          setCountState(state)
        }
      })
      .catch(() => {
        if (!abort.signal.aborted && currentGeneration === generation.current) {
          const preserveConfirmedFeed = hasConfirmedMark()
          setFeed((current) => ({
            view,
            attempt,
            state:
              preserveConfirmedFeed && current?.view === view && current.state.status === "ready"
                ? current.state
                : { status: "unavailable", error: "SERVICE_UNAVAILABLE" },
          }))
          setMarking((current) =>
            current.status === "confirmed" || current.status === "refresh-failed"
              ? { ...current, status: "refresh-failed" }
              : current,
          )
        }
      })
    return () => abort.abort()
  }, [attempt, commands, open, view])
  useEffect(() => {
    const refresh = () => {
      if (
        !pending.current &&
        (readBlockedUntil.current === undefined || readBlockedUntil.current <= Date.now()) &&
        !blockAutomaticReads.current &&
        document.visibilityState === "visible" &&
        navigator.onLine
      )
        setAttempt((current) => current + 1)
    }
    const timer = window.setInterval(refresh, 30_000)
    document.addEventListener("visibilitychange", refresh)
    window.addEventListener("online", refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", refresh)
      window.removeEventListener("online", refresh)
    }
  }, [])
  const state =
    feed?.view === view && feed.attempt === attempt ? feed.state : ({ status: "loading" } as const)
  const unreadCount =
    countState.status === "ready" && "unreadCount" in countState.response
      ? countState.response.unreadCount
      : undefined
  async function markRead(notificationIds: readonly string[], fromOpening = false) {
    if (pending.current || (retryAt !== undefined && retryAt > Date.now())) return
    if (!fromOpening) setOpening("idle")
    const selection = Object.freeze([...notificationIds])
    pending.current = true
    generation.current += 1
    setMarking({ status: "pending", notificationIds: selection })
    let result
    try {
      result = await commands.markRead({ notificationIds: selection })
    } catch {
      result = { ok: false as const, error: "SERVICE_UNAVAILABLE" as const, writeOutcome: "unknown" as const }
    }
    pending.current = false
    if (!mounted.current) return
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
    if (!onDestinationOpen || pending.current || (retryAt !== undefined && retryAt > Date.now())) return
    openingAbort.current?.abort()
    const abort = new AbortController()
    openingAbort.current = abort
    const selection = Object.freeze(item.members.map((member) => member.notificationId))
    const requestId = crypto.randomUUID()
    setOpeningId(requestId)
    setOpening("pending")
    setMarking({ status: "idle" })
    let outcome
    try {
      outcome = await onDestinationOpen({ requestId, destination: item.destination }, abort.signal)
    } catch {
      outcome = "unavailable" as const
    }
    if (abort.signal.aborted || !mounted.current) return
    setOpening(outcome)
    if (outcome === "displayed") await markRead(selection, true)
  }
  return {
    model: {
      state,
      unreadCount,
      view,
      marking,
      opening,
      openingId,
      isRetryBlocked: retryAt !== undefined && retryAt > now,
    },
    actions: {
      openItem: onDestinationOpen ? openItem : undefined,
      selectView: (next: NotificationView) => {
        blockAutomaticReads.current = false
        setView(next)
      },
      retry: () => {
        if (retryAt !== undefined && retryAt > Date.now()) return
        blockAutomaticReads.current = false
        setAttempt((current) => current + 1)
      },
      markRead,
      repeatMark: () => {
        if (marking.status === "rejected" || marking.status === "unknown")
          void markRead(marking.notificationIds)
      },
    },
  }
}
