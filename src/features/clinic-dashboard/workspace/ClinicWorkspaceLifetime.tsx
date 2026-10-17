"use client"

import {
  createContext,
  useCallback,
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
import { useEditorDepartureGuard } from "./useEditorDepartureGuard"
import { useExactClinicOpening } from "./useExactClinicOpening"

type Registration = Readonly<{
  authenticatedContext: AuthenticatedClinicContext
  authorizedClinics?: readonly AuthorizedClinic[]
  initialNotifications?: NotificationLoadState
}>
const loading: NotificationLoadState = { status: "loading" }
function useLifetime(isolated: boolean, commands?: NotificationCommands) {
  const pathname = usePathname()
  const activePath = useRef(pathname)
  const sessionPrincipal = useRef<string | undefined>(undefined)
  useLayoutEffect(() => {
    activePath.current = pathname
  }, [pathname])
  const router = useRouter()
  const [registration, setRegistration] = useState<Registration>()
  const departureGuard = useEditorDepartureGuard()
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
  const register = useCallback(
    (next: Registration, signal: AbortSignal) => {
      if (
        signal.aborted ||
        (!isolated &&
          activePath.current !== `/clinics/${encodeURIComponent(next.authenticatedContext.clinic.id)}`)
      )
        return
      if (sessionPrincipal.current && sessionPrincipal.current !== next.authenticatedContext.principal.id)
        onNavigationAway()
      sessionPrincipal.current = next.authenticatedContext.principal.id
      setRegistration((current) =>
        current?.authenticatedContext === next.authenticatedContext &&
        current.authorizedClinics === next.authorizedClinics &&
        current.initialNotifications === next.initialNotifications
          ? current
          : next,
      )
    },
    [isolated, onNavigationAway],
  )
  return {
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
