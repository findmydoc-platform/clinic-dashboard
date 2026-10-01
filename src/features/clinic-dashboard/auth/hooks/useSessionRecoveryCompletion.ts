"use client"

import { useEffect } from "react"
import { clearCompletedSessionRecovery } from "../browser/session-recovery-url"

export function useSessionRecoveryCompletion() {
  useEffect(clearCompletedSessionRecovery, [])
}
