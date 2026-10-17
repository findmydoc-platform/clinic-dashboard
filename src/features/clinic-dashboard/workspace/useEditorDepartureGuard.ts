"use client"

import { useCallback, useEffect, useRef } from "react"

type DepartureIntent = "context-change" | "destination" | "section"
type Editor = "profile" | "reviews" | "inquiries" | "gallery"
type Request = (continuation: () => void, onCancel?: () => void, intent?: DepartureIntent) => void

// Editors retain their own decisions, save commands and cleanup. This gate only
// sequences their continuations and rejects superseded navigation attempts.
export function useEditorDepartureGuard() {
  const editors = useRef<Partial<Record<Editor, Request>>>({})
  const pending = useRef<{ cancel?: () => void } | undefined>(undefined)
  const register = useCallback((editor: Editor, request?: Request | null) => {
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
    (intent: DepartureIntent, continuation: () => void, onCancel?: () => void) => {
      cancel()
      const attempt = { cancel: onCancel }
      pending.current = attempt
      const order: Editor[] = intent === "section" ? ["gallery"] : ["reviews", "profile", "inquiries"]
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
  const setProfileRequest = useCallback((request: Request | null) => register("profile", request), [register])
  const setReviewRequest = useCallback((request: Request | null) => register("reviews", request), [register])
  const setInquiryRequest = useCallback(
    (request: Request | null) => register("inquiries", request),
    [register],
  )
  const setGalleryRequest = useCallback((request?: Request) => register("gallery", request), [register])
  return { requestDeparture, setProfileRequest, setReviewRequest, setInquiryRequest, setGalleryRequest }
}
