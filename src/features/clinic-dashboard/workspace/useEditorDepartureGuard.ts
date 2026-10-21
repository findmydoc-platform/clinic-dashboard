"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type {
  EditorDepartureIntent,
  EditorDepartureRequest,
  ProtectedEditorWork,
} from "@/lib/editor-departure"

type Editor = "profile" | "reviews" | "inquiries" | "gallery"

// Editors retain their own decisions, save commands and cleanup. This gate only
// sequences their continuations and rejects superseded navigation attempts.
export function useEditorDepartureGuard() {
  const editors = useRef<Partial<Record<Editor, EditorDepartureRequest>>>({})
  const protectedRef = useRef<readonly ProtectedEditorWork[]>([])
  const [protectedWork, setProtectedWork] = useState<readonly ProtectedEditorWork[]>([])
  const pending = useRef<{ cancel?: () => void } | undefined>(undefined)
  const register = useCallback((editor: Editor, request?: EditorDepartureRequest | null) => {
    if (request) editors.current[editor] = request
    else delete editors.current[editor]
  }, [])
  const cancel = useCallback(() => {
    const previous = pending.current
    pending.current = undefined
    previous?.cancel?.()
  }, [])
  useEffect(() => cancel, [cancel])
  const requestDeparture = useCallback(
    (intent: EditorDepartureIntent, continuation: () => void, onCancel?: () => void) => {
      cancel()
      if (protectedRef.current.length) {
        onCancel?.()
        return
      }
      const attempt = { cancel: onCancel }
      pending.current = attempt
      const order: Editor[] =
        intent === "section"
          ? ["gallery"]
          : intent === "context-change"
            ? ["gallery", "reviews", "profile", "inquiries"]
            : ["reviews", "profile", "inquiries"]
      const proceed = (index: number) => {
        if (pending.current !== attempt) return
        const editor = order[index]
        if (!editor) {
          pending.current = undefined
          continuation()
          return
        }
        const request = editors.current[editor]
        if (request) {
          request(
            () => proceed(index + 1),
            () => {
              if (pending.current === attempt) cancel()
            },
            intent,
          )
        } else proceed(index + 1)
      }
      proceed(0)
    },
    [cancel],
  )
  const protectScope = useCallback(() => {
    cancel()
    if (protectedRef.current.length) return
    const requests = new Set(Object.values(editors.current))
    const work: ProtectedEditorWork[] = []
    for (const request of requests) {
      const protectedDraft = request?.(() => {}, undefined, "access-loss")
      if (protectedDraft) work.push(protectedDraft)
    }
    protectedRef.current = work
    setProtectedWork(work)
  }, [cancel])
  const clearProtection = useCallback((cleanup = true) => {
    const work = protectedRef.current
    protectedRef.current = []
    setProtectedWork([])
    if (cleanup)
      for (const editor of work) {
        // Session/principal cleanup stays with the original clinic command owner.
        void Promise.resolve()
          .then(() => editor.discard())
          .catch(() => {})
      }
  }, [])
  const discardProtectedWork = useCallback(async () => {
    const work = protectedRef.current
    for (const editor of work) await editor.discard()
    if (protectedRef.current === work) clearProtection(false)
  }, [clearProtection])
  const setProfileRequest = useCallback(
    (request: EditorDepartureRequest | null) => register("profile", request),
    [register],
  )
  const setReviewRequest = useCallback(
    (request: EditorDepartureRequest | null) => register("reviews", request),
    [register],
  )
  const setInquiryRequest = useCallback(
    (request: EditorDepartureRequest | null) => register("inquiries", request),
    [register],
  )
  const setGalleryRequest = useCallback(
    (request?: EditorDepartureRequest) => register("gallery", request),
    [register],
  )
  return {
    requestDeparture,
    setProfileRequest,
    setReviewRequest,
    setInquiryRequest,
    setGalleryRequest,
    protectScope,
    protectedWork,
    discardProtectedWork,
    clearProtection,
  }
}
