"use client"

import { useCallback, useRef, useState } from "react"
import {
  createSupportRequestResult,
  emptySupportRequest,
  validateSupportRequest,
  type SupportRequest,
  type SupportRequestErrors,
  type SupportRequestResult,
  type SupportScreenshot,
} from "../model/support-request"

export function useSupportRequestController() {
  const [request, setRequest] = useState<SupportRequest>(emptySupportRequest)
  const [errors, setErrors] = useState<SupportRequestErrors>({})
  const [result, setResult] = useState<SupportRequestResult>()
  const categoryRef = useRef<HTMLSelectElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const screenshotRef = useRef<HTMLInputElement>(null)

  const update = useCallback(<Key extends keyof SupportRequest>(key: Key, value: SupportRequest[Key]) => {
    setRequest((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }, [])

  const selectScreenshot = useCallback(
    (screenshot?: SupportScreenshot) => {
      update("screenshot", screenshot)
    },
    [update],
  )

  const submit = useCallback(() => {
    const nextErrors = validateSupportRequest(request)
    setErrors(nextErrors)
    const firstError = Object.keys(nextErrors)[0] as keyof SupportRequestErrors | undefined

    if (firstError) {
      const fields = {
        category: categoryRef,
        message: messageRef,
        screenshot: screenshotRef,
        subject: subjectRef,
      }
      fields[firstError].current?.focus()
      return
    }

    setResult(createSupportRequestResult())
  }, [request])

  return {
    actions: { selectScreenshot, submit, update },
    model: { errors, request, result },
    refs: { categoryRef, messageRef, screenshotRef, subjectRef },
  } as const
}
