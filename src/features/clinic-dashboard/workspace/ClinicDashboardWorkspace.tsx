"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react"
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
import { createSupportApiCommand } from "@/features/clinic-dashboard/support/public"
import { ClinicDashboardWorkspaceComposition } from "./ClinicDashboardWorkspaceComposition"
import {
  ClinicWorkspaceLifetimeProvider,
  useClinicWorkspaceLifetime,
  type ClinicWorkspaceLifetime,
} from "./ClinicWorkspaceLifetime"
import { rememberAuthorizedClinic } from "./browser/clinic-preference"
import type { ClinicDashboardSection } from "./model/workspace"
import type { ClinicDashboardWorkspaceInput } from "./model/workspace-input"
import { ClinicAccessRecoveryScreen } from "./components/organisms/ClinicAccessRecoveryScreen"

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
    recovery,
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
  } = lifetime
  useEffect(() => {
    const lease = new AbortController()
    register({ authenticatedContext, authorizedClinics, initialNotifications, initialSection }, lease.signal)
    return () => lease.abort()
  }, [authenticatedContext, authorizedClinics, initialNotifications, initialSection, register])
  const scope = `${authenticatedContext.principal.id}:${authenticatedContext.clinic.id}`
  const activeScope = useRef<string | undefined>(scope)
  useLayoutEffect(() => {
    activeScope.current = scope
    return () => {
      activeScope.current = undefined
    }
  }, [scope])
  const restrict = recovery.restrict
  const handleDomainAccessFailure = useCallback(
    (failure: "unauthorized" | "forbidden") => {
      if (activeScope.current !== scope) return
      if (failure === "unauthorized") recoverSession()
      else void restrict()
    },
    [recoverSession, restrict, scope],
  )
  const loadReporting = useCallback(
    (days: ClinicDashboardReportingPeriodDays) =>
      loadClinicDashboardReportingFromBrowser(authenticatedContext.clinic.id, days, fetch, (failure) => {
        if (activeScope.current !== scope) return
        if (failure === "unauthorized") recoverSession()
        else void restrict()
      }),
    [authenticatedContext.clinic.id, recoverSession, restrict, scope],
  )
  useEffect(() => {
    if (authorizedClinics)
      rememberAuthorizedClinic(authenticatedContext.principal.id, authenticatedContext.clinic.id)
  }, [authorizedClinics, authenticatedContext.principal.id, authenticatedContext.clinic.id])
  const [isSourceRefreshPending, startSourceRefresh] = useTransition()
  const doctorProfileCommands = useMemo(() => {
    // The command factory stores the callback; asynchronous commands invoke it later.
    // eslint-disable-next-line react-hooks/refs
    return createDoctorProfileApiCommands(authenticatedContext.clinic.id, handleDomainAccessFailure)
  }, [authenticatedContext.clinic.id, handleDomainAccessFailure])
  const clinicProfileSourceCommands = useMemo(() => {
    // The factory stores the scope-bound callback; asynchronous source failures invoke it.
    // eslint-disable-next-line react-hooks/refs
    return createClinicProfileSourceApiCommands(authenticatedContext.clinic.id, handleDomainAccessFailure)
  }, [authenticatedContext.clinic.id, handleDomainAccessFailure])
  const clinicGalleryCommands = useMemo(() => {
    // Gallery commands keep the current clinic and recovery callback in their private owner.
    // eslint-disable-next-line react-hooks/refs
    return createClinicGalleryApiCommands(authenticatedContext.clinic.id, handleDomainAccessFailure)
  }, [authenticatedContext.clinic.id, handleDomainAccessFailure])
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
  const reviewSourceCommands = useMemo(() => {
    // The factory stores this callback; only asynchronous command failures invoke it.
    // eslint-disable-next-line react-hooks/refs
    return createReviewSourceApiCommands(authenticatedContext.clinic.id, handleDomainAccessFailure)
  }, [authenticatedContext.clinic.id, handleDomainAccessFailure])
  const clinicTreatmentCommands = useMemo(() => {
    // The command factory stores this callback for source responses; it does not call it during render.
    // eslint-disable-next-line react-hooks/refs
    return createClinicTreatmentApiCommands(authenticatedContext.clinic.id, handleDomainAccessFailure)
  }, [authenticatedContext.clinic.id, handleDomainAccessFailure])

  const supportCommand = useMemo(() => {
    // The command stores the scope callback for later asynchronous failures.
    // eslint-disable-next-line react-hooks/refs
    return createSupportApiCommand(authenticatedContext.clinic.id, handleDomainAccessFailure)
  }, [authenticatedContext.clinic.id, handleDomainAccessFailure])

  const refreshSources = () => startSourceRefresh(() => router.refresh())

  if (recovery.model.restricted)
    return (
      <ClinicAccessRecoveryScreen
        model={recovery.model}
        onChoose={recovery.chooseClinic}
        onRefresh={() => void recovery.refreshChoices()}
        onDeclineDiscard={recovery.declineDiscard}
        onConfirmDiscard={() => void recovery.confirmDiscard()}
      />
    )
  return (
    <div
      data-clinic-workspace
      aria-busy={lifetime.registeredContext !== authenticatedContext}
      inert={lifetime.registeredContext !== authenticatedContext}
      onClick={openExactLink}
    >
      <ClinicDashboardWorkspaceComposition
        key={`${authenticatedContext.principal.id}:${authenticatedContext.clinic.id}`}
        authenticatedContext={authenticatedContext}
        departureGuard={departureGuard}
        onSectionChange={setSection}
        onAccessLost={() => void restrict()}
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
        supportCommand={supportCommand}
        clinicGalleryCommands={clinicGalleryCommands}
        clinicProfileSourceCommands={clinicProfileSourceCommands}
        clinicTreatmentCommands={clinicTreatmentCommands}
        doctorProfileCommands={doctorProfileCommands}
        focusInquiryId={focusInquiryId}
        focusReviewId={focusReviewId}
        initialReporting={initialReporting}
        reportingPreferenceScope={scope}
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
