"use client"
import { useEffect, useRef, useState } from "react"
import type { NotificationCommands, NotificationLoadState, NotificationView } from "../model/notifications"

export function useNotificationCenterController(
  commands: NotificationCommands,
  initialState: NotificationLoadState,
  open: boolean,
) {
  const blockAutomaticReads = useRef(false)
  const [view, setView] = useState<NotificationView>("unread")
  const [attempt, setAttempt] = useState(0)
  const [countState, setCountState] = useState(initialState)
  const [feed, setFeed] =
    useState<Readonly<{ view: NotificationView; attempt: number; state: NotificationLoadState }>>()
  useEffect(() => {
    const abort = new AbortController()
    commands
      .load(open ? { mode: "page", view } : { mode: "summary" }, abort.signal)
      .then((result) => {
        if (abort.signal.aborted) return
        const state: NotificationLoadState = result.ok
          ? { status: "ready", response: result.value }
          : { status: "unavailable", error: result.error }
        if (open) setFeed({ view, attempt, state })
        if (result.ok && "unreadCount" in result.value) setCountState(state)
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
        )
          setCountState(state)
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setFeed({ view, attempt, state: { status: "unavailable", error: "SERVICE_UNAVAILABLE" } })
      })
    return () => abort.abort()
  }, [attempt, commands, open, view])
  useEffect(() => {
    const refresh = () => {
      if (!blockAutomaticReads.current && document.visibilityState === "visible" && navigator.onLine)
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
  return {
    model: { state, unreadCount, view },
    actions: {
      selectView: (next: NotificationView) => {
        blockAutomaticReads.current = false
        setView(next)
      },
      retry: () => {
        blockAutomaticReads.current = false
        setAttempt((current) => current + 1)
      },
    },
  }
}
