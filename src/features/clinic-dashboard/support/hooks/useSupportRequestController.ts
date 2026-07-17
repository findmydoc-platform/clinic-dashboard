"use client"

import { useCallback, useRef, useState } from "react"
import {
  validateSupportRequest,
  type SupportReceipt,
  type SupportRequest,
  type SupportRequestErrors,
  type SupportScreenshot,
} from "../model/support-request"
import type { SupportCommands } from "../model/support-commands"

const emptyRequest: SupportRequest = {
  category: "",
  message: "",
  preferredReplyChannel: "Email",
  subject: "",
}

export function useSupportRequestController(commands: SupportCommands) {
  const [request, setRequest] = useState<SupportRequest>(emptyRequest)
  const [errors, setErrors] = useState<SupportRequestErrors>({})
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<SupportReceipt>()
  const categoryRef = useRef<HTMLSelectElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const screenshotRef = useRef<HTMLInputElement>(null)

  const update = useCallback(<Key extends keyof SupportRequest>(key: Key, value: SupportRequest[Key]) => {
    setRequest((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError("")
  }, [])

  const selectScreenshot = useCallback(
    (screenshot?: SupportScreenshot) => {
      update("screenshot", screenshot)
    },
    [update],
  )

  const submit = useCallback(async () => {
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

    setIsSubmitting(true)
    setSubmitError("")
    try {
      setReceipt(await commands.submitSupportRequest(request))
    } catch {
      setSubmitError("We couldn't send the support request. Check the details and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }, [commands, request])

  return {
    actions: { selectScreenshot, submit, update },
    model: { errors, isSubmitting, receipt, request, submitError },
    refs: { categoryRef, messageRef, screenshotRef, subjectRef },
  } as const
}
