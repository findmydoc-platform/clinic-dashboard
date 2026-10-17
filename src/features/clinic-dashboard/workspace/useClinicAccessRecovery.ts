"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  loadClinicDashboardChoices,
  type AuthorizedClinic,
  type ClinicAccessChoices,
} from "@/features/clinic-dashboard/auth/public"
import type { ClinicDashboardSection } from "./model/workspace"
import type { useEditorDepartureGuard } from "./useEditorDepartureGuard"
import type { ClinicAccessRecoveryModel } from "./model/clinic-access-recovery"

type State = Readonly<{
  scope?: string
  status: "active" | "loading" | "ready" | "unavailable" | "changing"
  choices: readonly AuthorizedClinic[]
  pendingClinic?: AuthorizedClinic
  error?: string
}>
const active: State = { status: "active", choices: [] }

export function useClinicAccessRecovery({
  principalId,
  clinicId,
  section,
  guard,
  loadChoices = loadClinicDashboardChoices,
  onChoose,
  onSessionLost,
}: Readonly<{
  principalId: string
  clinicId: string
  section: ClinicDashboardSection
  guard: ReturnType<typeof useEditorDepartureGuard>
  loadChoices?: (fetcher?: typeof fetch, signal?: AbortSignal) => Promise<ClinicAccessChoices>
  onChoose: (clinicId: string, section: ClinicDashboardSection) => void
  onSessionLost: () => void
}>) {
  const scope = `${principalId}:${clinicId}`
  const currentScope = useRef<string | undefined>(scope)
  const lossScope = useRef<string | undefined>(undefined)
  const generation = useRef(0)
  const choiceAbort = useRef<AbortController | undefined>(undefined)
  const sectionAtLoss = useRef(section)
  const [state, setState] = useState<State>(active)
  const { clearProtection, discardProtectedWork, protectedWork, protectScope } = guard

  useLayoutEffect(() => {
    currentScope.current = scope
    generation.current++
    choiceAbort.current?.abort()
    lossScope.current = undefined
    clearProtection()
    return () => {
      currentScope.current = undefined
      choiceAbort.current?.abort()
      clearProtection()
    }
  }, [scope, clearProtection])

  useEffect(() => {
    if (!protectedWork.length) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [protectedWork.length])

  const refreshChoices = useCallback(async () => {
    if (currentScope.current !== scope || lossScope.current !== scope) return
    const request = ++generation.current
    choiceAbort.current?.abort()
    const abort = new AbortController()
    choiceAbort.current = abort
    setState({ scope, status: "loading", choices: [] })
    const choices = await loadChoices(undefined, abort.signal).catch(
      () => ({ status: "temporarily-unavailable" }) as const,
    )
    if (abort.signal.aborted || request !== generation.current || currentScope.current !== scope) return
    if (
      choices.status === "unauthorized" ||
      (choices.status === "approved" && choices.context.principal.id !== principalId)
    ) {
      clearProtection()
      onSessionLost()
      return
    }
    if (choices.status === "temporarily-unavailable") {
      setState({ scope, status: "unavailable", choices: [] })
      return
    }
    setState({
      scope,
      status: "ready",
      choices:
        choices.status === "approved" ? choices.context.clinics.filter(({ id }) => id !== clinicId) : [],
    })
  }, [scope, clinicId, loadChoices, onSessionLost, principalId, clearProtection])

  const restrict = useCallback(async () => {
    if (currentScope.current !== scope || lossScope.current === scope) return
    lossScope.current = scope
    sectionAtLoss.current = section
    protectScope()
    await refreshChoices()
  }, [scope, section, protectScope, refreshChoices])

  const chooseClinic = (targetId: string) => {
    if (state.scope !== scope || state.status !== "ready") return
    const clinic = state.choices.find(({ id }) => id === targetId)
    if (!clinic) return
    if (protectedWork.length) setState({ ...state, pendingClinic: clinic, error: undefined })
    else {
      generation.current++
      setState({ ...state, status: "changing" })
      onChoose(clinic.id, sectionAtLoss.current)
    }
  }
  const declineDiscard = () => {
    generation.current++
    setState((previous) => ({ ...previous, pendingClinic: undefined, error: undefined }))
  }
  const confirmDiscard = async () => {
    const clinic = state.pendingClinic
    if (state.scope !== scope || !clinic || state.status !== "ready") return
    const operation = ++generation.current
    setState({ ...state, status: "changing" })
    try {
      await discardProtectedWork()
      if (operation !== generation.current || currentScope.current !== scope) return
      onChoose(clinic.id, sectionAtLoss.current)
    } catch {
      if (operation !== generation.current || currentScope.current !== scope) return
      setState({ ...state, error: "Unfinished work could not be discarded. Try again." })
    }
  }
  return {
    restrict,
    refreshChoices,
    chooseClinic,
    declineDiscard,
    confirmDiscard,
    model: {
      ...state,
      restricted: state.scope === scope && state.status !== "active",
      hasProtectedWork: protectedWork.length > 0,
    } satisfies ClinicAccessRecoveryModel,
  }
}
