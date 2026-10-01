"use client"

import { useEffect, useRef } from "react"

const submitRecoveryForm = (form: HTMLFormElement) => form.requestSubmit()

export function useSessionRecovery(submitAction = submitRecoveryForm) {
  const formRef = useRef<HTMLFormElement>(null)
  const hasSubmitted = useRef(false)
  useEffect(() => {
    if (!formRef.current || hasSubmitted.current) return
    hasSubmitted.current = true
    submitAction(formRef.current)
  }, [submitAction])
  return formRef
}
