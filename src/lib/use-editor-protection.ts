"use client"

import { useEffect } from "react"
import type { EditorDepartureRequest } from "./editor-departure"

/** Registers private in-memory form work before inaccessible UI is removed. */
export function useEditorProtection({
  open,
  dirty,
  draft,
  discard,
  register,
}: {
  open: boolean
  dirty: boolean
  draft: unknown
  discard: () => void | Promise<void>
  register?: (request: EditorDepartureRequest | null) => void
}) {
  useEffect(() => {
    if (!open) return
    register?.((_continue, _cancel, intent) => {
      if (intent === "access-loss" && dirty) return { draft, discard }
    })
    return () => register?.(null)
  }, [open, dirty, draft, discard, register])
}
