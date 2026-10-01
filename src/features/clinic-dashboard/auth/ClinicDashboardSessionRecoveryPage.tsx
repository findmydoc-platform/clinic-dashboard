"use client"

import { SessionRecoveryScreen } from "./components/organisms/SessionRecoveryScreen"
import { useSessionRecovery } from "./hooks/useSessionRecovery"
import type { ClinicDashboardReturnTarget } from "./model/auth"

type ClinicDashboardSessionRecoveryPageProps = Readonly<{
  attempt?: string
  csrfToken: string
  mode: "refresh" | "clear"
  returnTarget: ClinicDashboardReturnTarget
  submitAction?: (form: HTMLFormElement) => void
}>

export function ClinicDashboardSessionRecoveryPage({
  attempt = "",
  csrfToken,
  mode,
  returnTarget,
  submitAction,
}: ClinicDashboardSessionRecoveryPageProps) {
  const formRef = useSessionRecovery(submitAction)
  return (
    <SessionRecoveryScreen
      attempt={attempt}
      csrfToken={csrfToken}
      formRef={formRef}
      mode={mode}
      returnTarget={returnTarget}
    />
  )
}
