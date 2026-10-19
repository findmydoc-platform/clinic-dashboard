"use client"

import {
  createContext,
  useCallback,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import type { AuthenticatedClinicContext, AuthorizedClinic } from "@/features/clinic-dashboard/auth/public"
import {
  createNotificationApiCommands,
  useNotificationCenterController,
  type NotificationLoadState,
  type NotificationCommands,
} from "@/features/clinic-dashboard/notifications/public"
import type { ClinicDashboardSection } from "./model/workspace"
import { installClinicHistoryDeparture } from "./browser/clinic-history-departure"
import { useClinicAccessRecovery } from "./useClinicAccessRecovery"
import { useEditorDepartureGuard } from "./useEditorDepartureGuard"
import { useExactClinicOpening } from "./useExactClinicOpening"

type Registration = Readonly<{
  authenticatedContext: AuthenticatedClinicContext
  authorizedClinics?: readonly AuthorizedClinic[]
  initialSection?: ClinicDashboardSection
  initialNotifications?: NotificationLoadState
}>
const loading: NotificationLoadState = { status: "loading" }
function useLifetime(isolated: boolean, commands?: NotificationCommands) {
  const pathname = usePathname()
  const activePath = useRef(pathname)
  const sessionPrincipal = useRef<string | undefined>(undefined)
  const recoveryTarget = useRef<{ clinicId: string; section: ClinicDashboardSection } | undefined>(undefined)
  useLayoutEffect(() => {
    activePath.current = pathname
  }, [pathname])
  const router = useRouter()
  const [registration, setRegistration] = useState<Registration>()
  const departureGuard = useEditorDepartureGuard()
  const [section, setSection] = useState<ClinicDashboardSection>("dashboard")
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const navigate = useCallback((path: string) => router.push(path), [router])
  const principalId = registration?.authenticatedContext.principal.id ?? "unregistered"
  const clinicId = registration?.authenticatedContext.clinic.id ?? "unregistered"
  const exactOpening = useExactClinicOpening({
    principalId,
    clinicId,
    authorizedClinics: registration?.authorizedClinics,
    requestDeparture: departureGuard.requestDeparture,
    navigate,
  })
  const notificationCommands = useMemo(() => commands ?? createNotificationApiCommands(), [commands])
  const openExact = exactOpening.open
  const openNotification = useCallback<NonNullable<Parameters<typeof useNotificationCenterController>[3]>>(
    (request, signal) => {
      setNotificationsOpen(false)
      return openExact(request, signal)
    },
    [openExact],
  )
  const notifications = useNotificationCenterController(
    notificationCommands,
    registration?.initialNotifications ?? loading,
    notificationsOpen,
    openNotification,
    { principalId, clinicId, enabled: !!registration },
  )
  const cancelExactOpening = exactOpening.cancel
  const cancelNotificationOpening = notifications.actions.cancelOpening
  const onNavigationAway = useCallback(() => {
    cancelExactOpening()
    cancelNotificationOpening()
  }, [cancelExactOpening, cancelNotificationOpening])
  const { clearProtection, hasProtectedWork } = departureGuard
  useEffect(() => () => clearProtection(), [clearProtection])
  const recoverSession = useCallback(() => {
    onNavigationAway()
    clearProtection()
    router.replace("/auth/session/recover?mode=refresh&attempt=")
  }, [clearProtection, onNavigationAway, router])
  const chooseClinic = useCallback(
    (id: string, nextSection: ClinicDashboardSection) => {
      recoveryTarget.current = { clinicId: id, section: nextSection }
      onNavigationAway()
      router.push(`/clinics/${encodeURIComponent(id)}?section=${nextSection}`)
    },
    [onNavigationAway, router],
  )
  const recovery = useClinicAccessRecovery({
    principalId,
    clinicId,
    section,
    guard: departureGuard,
    onChoose: chooseClinic,
    onSessionLost: recoverSession,
    protectionOwnedBySession: true,
  })
  const isRestricted = recovery.isRestricted
  const restrictCurrentScope = recovery.restrict
  const restrict = useCallback(() => {
    // Capture the original editor commands before invalidating an exact opening.
    recoveryTarget.current = undefined
    const pending = restrictCurrentScope()
    onNavigationAway()
    return pending
  }, [restrictCurrentScope, onNavigationAway])
  const requestDeparture = departureGuard.requestDeparture
  const [historyReady, setHistoryReady] = useState(isolated)
  useEffect(() => {
    if (isolated) return
    let disposed = false
    let cleanup: (() => void) | undefined
    // Install outside React's effect flush, after Next's own History API wrapper.
    queueMicrotask(() => {
      if (disposed) return
      cleanup = installClinicHistoryDeparture({
        isRestricted,
        onNavigationAway,
        requestDeparture: (continuation, onCancel) =>
          requestDeparture("context-change", continuation, onCancel),
      })
      setHistoryReady(true)
    })
    return () => {
      disposed = true
      cleanup?.()
    }
  }, [isolated, isRestricted, onNavigationAway, requestDeparture])
  const protectionCount = departureGuard.protectedWork.length
  const register = useCallback(
    (next: Registration, signal: AbortSignal) => {
      if (
        signal.aborted ||
        (!isolated &&
          activePath.current !== `/clinics/${encodeURIComponent(next.authenticatedContext.clinic.id)}`)
      )
        return
      if (sessionPrincipal.current && sessionPrincipal.current !== next.authenticatedContext.principal.id) {
        onNavigationAway()
        clearProtection()
        recoveryTarget.current = undefined
      } else if (
        protectionCount ||
        hasProtectedWork() ||
        (isRestricted() &&
          (recoveryTarget.current?.clinicId !== next.authenticatedContext.clinic.id ||
            recoveryTarget.current.section !== (next.initialSection ?? "dashboard")))
      )
        return
      recoveryTarget.current = undefined
      if (registration?.authenticatedContext.clinic.id !== next.authenticatedContext.clinic.id)
        setSection(next.initialSection ?? "dashboard")
      sessionPrincipal.current = next.authenticatedContext.principal.id
      setRegistration((current) =>
        current?.authenticatedContext === next.authenticatedContext &&
        current.authorizedClinics === next.authorizedClinics &&
        current.initialNotifications === next.initialNotifications
          ? current
          : next,
      )
    },
    [
      isolated,
      onNavigationAway,
      clearProtection,
      hasProtectedWork,
      registration?.authenticatedContext.clinic.id,
      protectionCount,
      isRestricted,
    ],
  )
  return {
    registeredContext: historyReady ? registration?.authenticatedContext : undefined,
    recovery: { ...recovery, restrict },
    recoverSession,
    setSection,
    departureGuard,
    exactOpening,
    notificationCommands,
    notifications,
    notificationsOpen,
    setNotificationsOpen,
    onNavigationAway,
    register,
  }
}
export type ClinicWorkspaceLifetime = ReturnType<typeof useLifetime>
const LifetimeContext = createContext<ClinicWorkspaceLifetime | undefined>(undefined)

// This owner survives the dynamic clinic page. It stores only this mounted
// browser session's pending interaction, never authority or a shared data cache.
export function ClinicWorkspaceLifetimeProvider({
  children,
  isolated = false,
  notificationCommands,
}: Readonly<{ children: ReactNode; isolated?: boolean; notificationCommands?: NotificationCommands }>) {
  const lifetime = useLifetime(isolated, notificationCommands)
  return <LifetimeContext value={lifetime}>{children}</LifetimeContext>
}
export function useClinicWorkspaceLifetime() {
  return useContext(LifetimeContext)
}
