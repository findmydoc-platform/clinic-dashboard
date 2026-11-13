"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { InquiryOpenInventoryCommands } from "@/features/clinic-dashboard/messages/public"
import type { OperationalWorkloadCardState } from "../model/operational-workload"

type Input = Readonly<{
  scope: string
  commands: InquiryOpenInventoryCommands
  enabled: boolean
  onSessionLost?: () => void
  onAccessLost?: () => void
}>

export function useOpenInquiryInventory({ scope, commands, enabled, onSessionLost, onAccessLost }: Input) {
  const [result, setResult] = useState<Readonly<{ scope: string; state: OperationalWorkloadCardState }>>()
  const generation = useRef(0)
  const scopeRef = useRef(scope)
  const pending = useRef<Readonly<{ scope: string; promise: Promise<void> }> | undefined>(undefined)
  const callbacks = useRef({ onSessionLost, onAccessLost })
  useLayoutEffect(() => {
    callbacks.current = { onSessionLost, onAccessLost }
  }, [onSessionLost, onAccessLost])
  useLayoutEffect(() => {
    scopeRef.current = scope
    generation.current += 1
    pending.current = undefined
    return () => {
      generation.current += 1
      pending.current = undefined
    }
  }, [scope, commands, enabled])
  const refresh = useCallback(() => {
    if (!enabled) return Promise.resolve()
    if (pending.current?.scope === scope) return pending.current.promise
    const request = ++generation.current
    const current = () => request === generation.current && scopeRef.current === scope
    setResult({ scope, state: { status: "loading" } })
    const promise = Promise.resolve()
      .then(() => commands.loadOpenInventory())
      .catch(() => ({ ok: false, error: { code: "service-unavailable" } }) as const)
      .then((response) => {
        if (!current()) return
        if (!response || !response.ok) {
          setResult({ scope, state: { status: "unavailable" } })
          if (response?.error.code === "unauthorized") callbacks.current.onSessionLost?.()
          if (response?.error.code === "access-denied") callbacks.current.onAccessLost?.()
          return
        }
        setResult({ scope, state: { status: "ready", count: response.value.count } })
      })
      .finally(() => {
        if (current()) pending.current = undefined
      })
    pending.current = { scope, promise }
    return promise
  }, [commands, scope, enabled])
  useEffect(() => {
    let active = true
    if (enabled)
      queueMicrotask(() => {
        if (active) void refresh()
      })
    return () => {
      active = false
      generation.current += 1
    }
  }, [enabled, refresh])
  return { state: result?.scope === scope ? result.state : ({ status: "loading" } as const), refresh }
}
