"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { ReviewSourceCommandError } from "../model/review-source-commands"
import type { ReviewSourceCommands } from "../model/review-source-commands"
import type { ReviewWorkloadState } from "../model/review-workload"

type Input = Readonly<{
  scope: string
  commands: ReviewSourceCommands
  enabled?: boolean
  onAccessFailure?: (failure: "unauthorized" | "forbidden") => void
}>

export function useReviewWorkloadController({ scope, commands, enabled = true, onAccessFailure }: Input) {
  const [result, setResult] = useState<Readonly<{ scope: string; state: ReviewWorkloadState }>>()
  const callbacks = useRef(onAccessFailure)
  useLayoutEffect(() => {
    callbacks.current = onAccessFailure
  }, [onAccessFailure])
  const generation = useRef(0)
  const activeRead = useRef<Readonly<{ abort: AbortController; promise: Promise<void> }> | undefined>(
    undefined,
  )
  useLayoutEffect(() => {
    generation.current += 1
    activeRead.current = undefined
    return () => {
      generation.current += 1
      activeRead.current?.abort.abort()
      activeRead.current = undefined
    }
  }, [scope, commands, enabled])
  const retry = useCallback(() => {
    if (!enabled) return Promise.resolve()
    if (activeRead.current) return activeRead.current.promise
    const abort = new AbortController()
    const current = ++generation.current
    setResult((previous) => ({
      scope,
      state:
        previous?.scope === scope && previous.state.status === "ready"
          ? {
              ...previous.state,
              refreshState: previous.state.refreshState === "stale" ? "stale" : "updating",
            }
          : { status: "loading" },
    }))
    const promise = Promise.resolve()
      .then(() => commands.loadWorkload(abort.signal))
      .then(
        (workload) => {
          if (abort.signal.aborted || current !== generation.current) return
          setResult({ scope, state: { status: "ready", workload, refreshState: "idle" } })
        },
        (error: unknown) => {
          if (abort.signal.aborted || current !== generation.current) return
          const accessFailure =
            error instanceof ReviewSourceCommandError &&
            (error.kind === "unauthorized" || error.kind === "forbidden")
              ? error.kind
              : undefined
          setResult((previous) => ({
            scope,
            state:
              !accessFailure && previous?.scope === scope && previous.state.status === "ready"
                ? { ...previous.state, refreshState: "stale" }
                : { status: "unavailable" },
          }))
          if (accessFailure) callbacks.current?.(accessFailure)
        },
      )
      .finally(() => {
        if (current === generation.current) activeRead.current = undefined
      })
    activeRead.current = { abort, promise }
    return promise
  }, [commands, scope, enabled])
  useEffect(() => {
    let active = true
    if (enabled)
      queueMicrotask(() => {
        if (active) void retry()
      })
    return () => {
      active = false
    }
  }, [enabled, retry])
  return {
    model: result?.scope === scope ? result.state : { status: "loading" as const },
    actions: { retry },
  }
}
