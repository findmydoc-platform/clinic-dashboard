"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import type { AuthenticatedClinicContext, AuthorizedClinic } from "@/features/clinic-dashboard/auth/public"
import {
  parseClinicDashboardExactTarget,
  useSessionRecoveryCompletion,
} from "@/features/clinic-dashboard/auth/public"
import {
  createClinicProfileSourceApiCommands,
  createClinicGalleryApiCommands,
  createClinicTreatmentApiCommands,
  createDoctorProfileApiCommands,
} from "@/features/clinic-dashboard/clinic-profile/public"
import type { ClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/public"
import { createReviewSourceApiCommands } from "@/features/clinic-dashboard/reviews/public"
import {
  loadClinicDashboardReportingFromBrowser,
  type ClinicDashboardReportingPeriodDays,
  type ClinicDashboardReportingLoadState,
} from "@/features/clinic-dashboard/dashboard/public"
import { type NotificationLoadState } from "@/features/clinic-dashboard/notifications/public"
import { ClinicDashboardWorkspaceComposition } from "./ClinicDashboardWorkspaceComposition"
import {
  ClinicWorkspaceLifetimeProvider,
  useClinicWorkspaceLifetime,
  type ClinicWorkspaceLifetime,
} from "./ClinicWorkspaceLifetime"
import { rememberAuthorizedClinic } from "./browser/clinic-preference"
import type { ClinicDashboardSection } from "./model/workspace"
import type { ClinicDashboardWorkspaceInput } from "./model/workspace-input"

export type ClinicDashboardWorkspaceProps = Readonly<{
  authenticatedContext: AuthenticatedClinicContext
  authorizedClinics?: readonly AuthorizedClinic[]
  initialSection?: ClinicDashboardSection
  selectionNotice?: string
  focusInquiryId?: string
  focusReviewId?: string
  initialReporting?: ClinicDashboardReportingLoadState
  initialNotifications?: NotificationLoadState
  prototypeMode: ClinicDashboardPrototypeMode
  showPrototypeModeToggle?: boolean
  workspaceInput: ClinicDashboardWorkspaceInput
}>

export function ClinicDashboardWorkspace(props: ClinicDashboardWorkspaceProps) {
  const lifetime = useClinicWorkspaceLifetime()
  if (!lifetime)
    return (
      <ClinicWorkspaceLifetimeProvider isolated>
        <ClinicDashboardWorkspace {...props} />
      </ClinicWorkspaceLifetimeProvider>
    )
  return <ClinicDashboardWorkspaceContent {...props} lifetime={lifetime} />
}

function ClinicDashboardWorkspaceContent({
  authenticatedContext,
  authorizedClinics,
  initialSection,
  selectionNotice,
  focusInquiryId,
  focusReviewId,
  initialReporting,
  initialNotifications,
  prototypeMode,
  showPrototypeModeToggle = false,
  workspaceInput,
  lifetime,
}: ClinicDashboardWorkspaceProps & Readonly<{ lifetime: ClinicWorkspaceLifetime }>) {
  useSessionRecoveryCompletion()
  const router = useRouter()
  const {
    departureGuard,
    exactOpening,
    notificationCommands,
    notifications,
    notificationsOpen,
    setNotificationsOpen,
    onNavigationAway,
    register,
  } = lifetime
  useEffect(() => {
    const lease = new AbortController()
    register({ authenticatedContext, authorizedClinics, initialNotifications }, lease.signal)
    return () => lease.abort()
  }, [authenticatedContext, authorizedClinics, initialNotifications, register])
  const scope = `${authenticatedContext.principal.id}:${authenticatedContext.clinic.id}`
  const activeScope = useRef(scope)
  const [restrictedScope, setRestrictedScope] = useState<string>()
  useEffect(() => {
    activeScope.current = scope
  }, [scope])
  const loadReporting = useCallback(
    (days: ClinicDashboardReportingPeriodDays) =>
      loadClinicDashboardReportingFromBrowser(authenticatedContext.clinic.id, days, fetch, (failure) => {
        if (activeScope.current !== scope) return
        setRestrictedScope(scope)
        router.replace(
          failure === "unauthorized"
            ? "/auth/session/recover?mode=refresh&attempt="
            : "/access?state=restricted",
        )
      }),
    [authenticatedContext.clinic.id, router, scope],
  )
  useEffect(() => {
    if (authorizedClinics)
      rememberAuthorizedClinic(authenticatedContext.principal.id, authenticatedContext.clinic.id)
  }, [authorizedClinics, authenticatedContext.principal.id, authenticatedContext.clinic.id])
  const [isSourceRefreshPending, startSourceRefresh] = useTransition()
  const doctorProfileCommands = useMemo(() => createDoctorProfileApiCommands(), [])
  const clinicProfileSourceCommands = useMemo(() => createClinicProfileSourceApiCommands(), [])
  const clinicGalleryCommands = useMemo(() => createClinicGalleryApiCommands(), [])
  const cancelNotificationOpening = notifications.actions.cancelOpening
  const openExactDestination = exactOpening.open
  const openExactLink = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      )
        return
      const anchor = event.target.closest("a[href]")
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        !event.currentTarget.contains(anchor) ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      )
        return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin || url.hash) return
      const target = parseClinicDashboardExactTarget(`${url.pathname}${url.search}`)
      if (!target) return
      event.preventDefault()
      cancelNotificationOpening()
      void openExactDestination(
        {
          requestId: crypto.randomUUID(),
          clinicId: target.clinicId,
          destination:
            target.kind === "inquiry"
              ? { kind: "inquiry", inquiryId: target.recordId }
              : { kind: "review", reviewId: target.recordId },
        },
        new AbortController().signal,
      )
    },
    [cancelNotificationOpening, openExactDestination],
  )
  const reviewSourceCommands = useMemo(
    () => createReviewSourceApiCommands(authenticatedContext.clinic.id),
    [authenticatedContext.clinic.id],
  )
  const clinicTreatmentCommands = useMemo(() => createClinicTreatmentApiCommands(), [])
  const refreshSources = () => startSourceRefresh(() => router.refresh())

  if (restrictedScope === scope) return <p role="alert">Clinic access is no longer available.</p>
  return (
    <div data-clinic-workspace onClick={openExactLink}>
      <ClinicDashboardWorkspaceComposition
        key={`${authenticatedContext.principal.id}:${authenticatedContext.clinic.id}`}
        authenticatedContext={authenticatedContext}
        departureGuard={departureGuard}
        notificationController={notifications}
        notificationsOpen={notificationsOpen}
        onNotificationsOpenChange={setNotificationsOpen}
        onNotificationDestinationOpen={exactOpening.open}
        notificationOpeningRequest={exactOpening.request}
        onNotificationOpeningResult={exactOpening.complete}
        onNavigationAway={onNavigationAway}
        authorizedClinics={authorizedClinics}
        selectionNotice={selectionNotice}
        start={{ section: initialSection }}
        onClinicChange={(clinicId, section) =>
          startSourceRefresh(() => router.push(`/clinics/${encodeURIComponent(clinicId)}?section=${section}`))
        }
        clinicGalleryCommands={clinicGalleryCommands}
        clinicProfileSourceCommands={clinicProfileSourceCommands}
        clinicTreatmentCommands={clinicTreatmentCommands}
        doctorProfileCommands={doctorProfileCommands}
        focusInquiryId={focusInquiryId}
        focusReviewId={focusReviewId}
        initialReporting={initialReporting}
        loadReporting={loadReporting}
        isSourceRefreshPending={isSourceRefreshPending}
        onSourceRefresh={refreshSources}
        initialNotifications={initialNotifications}
        notificationCommands={notificationCommands}
        prototypeMode={prototypeMode}
        reviewCommands={reviewSourceCommands}
        showPrototypeModeToggle={showPrototypeModeToggle}
        workspaceInput={workspaceInput}
      />
    </div>
  )
}
