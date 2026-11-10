"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ReviewSourceCommands } from "../model/review-source-commands"
import type { ReviewWorkloadState } from "../model/review-workload"

type Input = Readonly<{ scope: string; commands: ReviewSourceCommands }>

export function useReviewWorkloadController({ scope, commands }: Input) {
  const [result, setResult] = useState<Readonly<{ scope: string; state: ReviewWorkloadState }>>()
  const generation = useRef(0)
  const activeRead = useRef<AbortController | undefined>(undefined)
  const load = useCallback(
    async (abort: AbortController, current: number) => {
      try {
        const workload = await commands.loadWorkload(abort.signal)
        if (abort.signal.aborted || current !== generation.current) return
        setResult({ scope, state: { status: "ready", workload } })
      } catch {
        if (abort.signal.aborted || current !== generation.current) return
        setResult({ scope, state: { status: "unavailable" } })
      }
    },
    [commands, scope],
  )
  useEffect(() => {
    const abort = new AbortController()
    activeRead.current = abort
    void load(abort, ++generation.current)
    return () => abort.abort()
  }, [load])
  const retry = useCallback(async () => {
    activeRead.current?.abort()
    const abort = new AbortController()
    activeRead.current = abort
    setResult({ scope, state: { status: "loading" } })
    await load(abort, ++generation.current)
  }, [load, scope])
  return {
    model: result?.scope === scope ? result.state : { status: "loading" as const },
    actions: { retry },
  }
}
