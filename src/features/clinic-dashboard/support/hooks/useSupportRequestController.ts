"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  emptySupportRequest,
  validateSupportRequest,
  type SupportCommand,
  type SupportRequest,
  type SupportRequestErrors,
  type SupportRequestResult,
} from "../model/support-request"

export function useSupportRequestController(send: SupportCommand) {
  const [request, setRequest] = useState<SupportRequest>(emptySupportRequest)
  const [errors, setErrors] = useState<SupportRequestErrors>({})
  const [result, setResult] = useState<SupportRequestResult>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inFlight = useRef(false)
  const generation = useRef(0)
  const subjectRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  useEffect(
    () => () => {
      generation.current += 1
    },
    [],
  )
  const update = useCallback(<Key extends keyof SupportRequest>(key: Key, value: SupportRequest[Key]) => {
    setRequest((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }, [])
  const reset = useCallback(() => {
    generation.current += 1
    inFlight.current = false
    setRequest({ ...emptySupportRequest })
    setErrors({})
    setResult(undefined)
    setIsSubmitting(false)
  }, [])
  const submit = useCallback(async () => {
    if (inFlight.current) return
    const nextErrors = validateSupportRequest(request)
    setErrors(nextErrors)
    if (nextErrors.subject) {
      subjectRef.current?.focus()
      return
    }
    if (nextErrors.message) {
      messageRef.current?.focus()
      return
    }
    inFlight.current = true
    setIsSubmitting(true)
    setResult(undefined)
    const attempt = generation.current
    let outcome: SupportRequestResult
    try {
      outcome = await send(request)
    } catch {
      outcome = { status: "unknown" }
    }
    if (generation.current !== attempt) return
    setResult(outcome)
    setIsSubmitting(false)
    inFlight.current = false
  }, [request, send])
  return {
    actions: { reset, submit, update },
    model: { errors, isSubmitting, request, result },
    refs: { messageRef, subjectRef },
  } as const
}
