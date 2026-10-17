"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  createClinicDashboardLoginPath,
  createClinicDashboardReturnTarget,
  submitClinicDashboardAuthAction,
  type AuthenticatedClinicContext,
} from "@/features/clinic-dashboard/auth/public"
import {
  ClinicProfile,
  type ClinicGalleryCommands,
  type ClinicGallerySnapshot,
  type ClinicProfileFocusTarget,
  type ClinicProfileSourceCommands,
  type ClinicTreatmentCommands,
  type DoctorDirectorySnapshot,
  type DoctorProfileCommands,
} from "@/features/clinic-dashboard/clinic-profile/public"
import {
  DashboardOverviewScreen,
  DashboardScreen,
  DashboardPeriodControl,
  useDashboardController,
  ReportingPeriodControl,
  useDashboardOverviewController,
  createDashboardClinicPreview,
  ProfileTaskDialog,
  type ClinicDashboardReportingLoadState,
  type ClinicDashboardReporting,
  type ClinicDashboardReportingPeriodDays,
  type DashboardSnapshot,
} from "@/features/clinic-dashboard/dashboard/public"
import {
  InquiryQueue,
  type InquiryOpeningRequest,
  type InquiryOpeningResult,
  type InquiryWorkspaceCommands,
} from "@/features/clinic-dashboard/messages/public"
import {
  getClinicDashboardDemoInteractionPolicy,
  isClinicDashboardPrototypeMode,
  PrototypeModeSwitch,
  type ClinicDashboardPrototypeMode,
} from "@/features/clinic-dashboard/prototype/public"
import {
  Reviews,
  type ReviewOpeningRequest,
  type ReviewOpeningResult,
  type ReviewSourceCommands,
} from "@/features/clinic-dashboard/reviews/public"
import { SupportRequestDialog } from "@/features/clinic-dashboard/support/public"
import { ClinicDashboardShell } from "./ClinicDashboardShell"
import { AccountMenu } from "./components/molecules/AccountMenu"
import { ClinicLocationSelector } from "./components/molecules/ClinicLocationSelector"
import { FutureAreaPlaceholderScreen } from "./components/organisms/FutureAreaPlaceholderScreen"
import {
  NotificationCenter,
  type NotificationDestinationOpen,
  type NotificationOpeningOutcome,
  type NotificationCommands,
  type NotificationLoadState,
} from "@/features/clinic-dashboard/notifications/public"
import { getClinicDashboardLocation, type ClinicDashboardLocationId } from "./model/locations"
import type { ClinicDashboardDialog, ClinicDashboardSection } from "./model/workspace"
import {
  getClinicDashboardLocationSnapshot,
  type ClinicDashboardWorkspaceInput,
} from "./model/workspace-input"
import { selectClinicDashboardNavigationItems, selectSafeClinicDashboardSection } from "./navigation"
import { useEditorDepartureGuard } from "./useEditorDepartureGuard"
import { useClinicDashboardController } from "./useClinicDashboardController"

export type ClinicDashboardWorkspaceStartState =
  | Readonly<{
      dialog?: undefined
      section?: ClinicDashboardSection
    }>
  | Readonly<{
      dialog: Extract<ClinicDashboardDialog, "patient-inquiry">
      section: Extract<ClinicDashboardSection, "messages">
    }>
  | Readonly<{
      dialog: Extract<ClinicDashboardDialog, "treatment">
      section: Extract<ClinicDashboardSection, "profile">
    }>

type ClinicDashboardWorkspaceCompositionProps = Readonly<{
  authenticatedContext: AuthenticatedClinicContext
  clinicGalleryCommands: ClinicGalleryCommands
  clinicProfileSourceCommands: ClinicProfileSourceCommands
  clinicTreatmentCommands: ClinicTreatmentCommands
  doctorProfileCommands: DoctorProfileCommands
  initialNotifications?: NotificationLoadState
  notificationCommands: NotificationCommands
  initialNotificationsOpen?: boolean
  initialReporting?: ClinicDashboardReportingLoadState
  loadReporting?: (days: ClinicDashboardReportingPeriodDays) => Promise<ClinicDashboardReporting | undefined>
  inquiryCommands?: InquiryWorkspaceCommands
  focusInquiryId?: string
  isSourceRefreshPending: boolean
  onSourceRefresh: () => void
  prototypeMode: ClinicDashboardPrototypeMode
  // Explicit Storybook/QA input. Normal workspace entry never supplies demo reporting.
  reportingDemo?: DashboardSnapshot
  reviewCommands: ReviewSourceCommands
  showPrototypeModeToggle: boolean
  start?: ClinicDashboardWorkspaceStartState
  workspaceInput: ClinicDashboardWorkspaceInput
}>

export function ClinicDashboardWorkspaceComposition({
  authenticatedContext,
  clinicGalleryCommands,
  clinicProfileSourceCommands,
  clinicTreatmentCommands,
  doctorProfileCommands,
  focusInquiryId,
  inquiryCommands,
  initialNotifications = { status: "loading" },
  notificationCommands,
  initialNotificationsOpen = false,
  initialReporting,
  loadReporting,
  isSourceRefreshPending,
  onSourceRefresh,
  prototypeMode,
  reportingDemo,
  reviewCommands,
  showPrototypeModeToggle,
  start = {},
  workspaceInput,
}: ClinicDashboardWorkspaceCompositionProps) {
  const [doctorDirectoryProjection, setDoctorDirectoryProjection] = useState<DoctorDirectorySnapshot>()
  const [galleryProjection, setGalleryProjection] = useState<ClinicGallerySnapshot>()
  const [hasUnsavedInquiryDrafts, setHasUnsavedInquiryDrafts] = useState(false)
  const [inquiryUnreadCount, setInquiryUnreadCount] = useState(
    workspaceInput.inquiryQueue.status === "ready" ? workspaceInput.inquiryQueue.unreadCount : 0,
  )
  const [inquiryOpeningRequest, setInquiryOpeningRequest] =
    useState<Readonly<{ scope: string; request: InquiryOpeningRequest }>>()
  const [reviewOpeningRequest, setReviewOpeningRequest] =
    useState<Readonly<{ scope: string; request: ReviewOpeningRequest }>>()
  const pendingOpeningRef = useRef<
    | Readonly<{ requestId: string; resolve: (outcome: NotificationOpeningOutcome) => void; scope: string }>
    | undefined
  >(undefined)
  const scope = `${authenticatedContext.principal.id}:${authenticatedContext.clinic.id}`
  const scopeRef = useRef(scope)
  const { requestDeparture, setProfileRequest, setReviewRequest, setInquiryRequest, setGalleryRequest } =
    useEditorDepartureGuard()
  const cancelOpening = useCallback(() => {
    pendingOpeningRef.current?.resolve("cancelled")
    pendingOpeningRef.current = undefined
    setInquiryOpeningRequest(undefined)
    setReviewOpeningRequest(undefined)
  }, [])
  useEffect(() => {
    scopeRef.current = scope
    pendingOpeningRef.current?.resolve("cancelled")
    pendingOpeningRef.current = undefined
    return () => {
      pendingOpeningRef.current?.resolve("cancelled")
      pendingOpeningRef.current = undefined
    }
  }, [scope, cancelOpening])
  const onInquiryOpeningResult = useCallback((result: InquiryOpeningResult) => {
    const pending = pendingOpeningRef.current
    if (!pending || pending.requestId !== result.requestId || pending.scope !== scopeRef.current) return
    pendingOpeningRef.current = undefined
    pending.resolve(result.status)
    setInquiryOpeningRequest(undefined)
  }, [])
  const onReviewOpeningResult = useCallback((result: ReviewOpeningResult) => {
    const pending = pendingOpeningRef.current
    if (!pending || pending.requestId !== result.requestId || pending.scope !== scopeRef.current) return
    pendingOpeningRef.current = undefined
    pending.resolve(result.status)
    setReviewOpeningRequest(undefined)
  }, [])
  if (!isClinicDashboardPrototypeMode(prototypeMode)) {
    throw new Error(`Unsupported clinic dashboard prototype mode: ${prototypeMode}`)
  }

  getClinicDashboardLocation(workspaceInput.locations, workspaceInput.defaultLocationId)
  const profileProgress = isSourceRefreshPending
    ? ({ status: "loading" } as const)
    : workspaceInput.profileProgress
  const initialProfileTask = profileProgress.status === "ready" ? profileProgress.tasks[0] : undefined

  const controller = useClinicDashboardController({
    initialLocationId: workspaceInput.defaultLocationId,
    initialNotificationsOpen,
    initialProfileTask,
    initialSection: focusInquiryId ? "messages" : (start.section ?? "dashboard"),
    prototypeMode,
  })
  const { actions, model } = controller
  const capabilities = getClinicDashboardDemoInteractionPolicy(model.activePrototypeMode)
  const sourceProfileManagement = authenticatedContext.capabilities.includes("clinic-profile:view")
    ? authenticatedContext.capabilities.includes("clinic-profile:edit")
      ? "interactive"
      : "read-only"
    : "hidden"
  const galleryManagement = authenticatedContext.capabilities.includes("clinic-gallery:view")
    ? authenticatedContext.capabilities.includes("clinic-gallery:edit")
      ? "interactive"
      : "read-only"
    : "hidden"
  const canViewTreatments = authenticatedContext.capabilities.includes("clinic-treatments:view")
  const canEditTreatments = authenticatedContext.capabilities.includes("clinic-treatments:edit")
  const treatmentManagement = canViewTreatments ? (canEditTreatments ? "interactive" : "read-only") : "hidden"
  const navigationItems = selectClinicDashboardNavigationItems({
    showCertificatesAccreditationsPlaceholder: capabilities.showCertificatesAccreditationsPlaceholder,
    showSubscriptionsPlaceholder: capabilities.showSubscriptionsPlaceholder,
  })
  const activeSection = selectSafeClinicDashboardSection(model.activeSection, navigationItems)
  const effectiveLocationId = capabilities.canSwitchLocations
    ? model.selectedLocationId
    : workspaceInput.defaultLocationId
  const selectedLocation = getClinicDashboardLocation(workspaceInput.locations, effectiveLocationId)
  const selectedSnapshot = getClinicDashboardLocationSnapshot(workspaceInput, selectedLocation.id)
  const effectiveGallerySnapshot = galleryProjection ?? workspaceInput.gallerySnapshot
  const effectiveGalleryStatus = galleryProjection ? "ready" : workspaceInput.galleryStatus
  const publishedGalleryItems =
    effectiveGallerySnapshot?.items.filter((item) => item.status === "published") ?? []
  const selectedProfile =
    effectiveGallerySnapshot || effectiveGalleryStatus !== "ready"
      ? {
          ...selectedSnapshot.clinicProfile,
          gallery: publishedGalleryItems.slice(0, 4).map((item, index) => ({
            alt: item.alt,
            id: item.id,
            isCover: index === 0,
            src: item.thumbnailUrl ?? item.url,
          })),
          galleryTotal: publishedGalleryItems.length,
        }
      : selectedSnapshot.clinicProfile
  const accountInitials = authenticatedContext.principal.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  const dashboard = useDashboardOverviewController({
    initialReporting: initialReporting ?? { status: "temporarily-unavailable" },
    loadReporting,
    profileProgress,
    clinicPreview: createDashboardClinicPreview({
      clinicName: authenticatedContext.clinic.name,
      profile: workspaceInput.profileSourceSnapshot,
      gallery: effectiveGallerySnapshot,
      galleryStatus: effectiveGalleryStatus,
    }),
  })
  const demo = useDashboardController({
    canExportProfileViews: reportingDemo !== undefined,
    initialReportingPeriod: "30 days",
    locationSummary: {
      name: selectedLocation.name,
      location: selectedLocation.location,
      coverImage: selectedSnapshot.clinicProfile.gallery[0]?.src,
      coverAlt: selectedSnapshot.clinicProfile.gallery[0]?.alt,
    },
    profileProgress,
    snapshot: reportingDemo,
  })
  const clinicLocations = reportingDemo
    ? workspaceInput.locations
    : [
        {
          id: authenticatedContext.clinic.id,
          name: authenticatedContext.clinic.name,
          location:
            dashboard.model.clinicPreview.status === "available"
              ? dashboard.model.clinicPreview.location
              : "",
          selectorLabel: authenticatedContext.clinic.name,
        },
      ]

  const signOut = async () => {
    if (
      hasUnsavedInquiryDrafts &&
      !window.confirm("Sign out and discard all unsent inquiry replies, internal notes and attachments?")
    ) {
      return { cancelled: true, ok: false }
    }
    const result = await submitClinicDashboardAuthAction("/api/auth/logout", {})
    if (result.ok && result.body.redirectTo === "/login") {
      // Reload the document after logout to clear authenticated client state.
      window.location.assign(new URL("/login", window.location.origin).href)
      return { ok: true }
    }
    return { message: "Sign out failed. Please try again.", ok: false }
  }

  const handleInquirySessionLoss = useCallback((inquiryId?: string) => {
    const returnTarget = createClinicDashboardReturnTarget(inquiryId)
    window.location.assign(createClinicDashboardLoginPath(returnTarget))
  }, [])

  const openNotificationDestination = useCallback<NotificationDestinationOpen>(
    (request, signal) => {
      if (model.supportOpen || model.profileTaskOpen) return Promise.resolve("cancelled")
      if (signal.aborted) return Promise.resolve("cancelled")
      cancelOpening()
      return new Promise((resolve) => {
        const pending = { requestId: request.requestId, resolve, scope }
        pendingOpeningRef.current = pending
        const cancel = () => {
          if (pendingOpeningRef.current === pending) cancelOpening()
        }
        signal.addEventListener("abort", cancel, { once: true })
        const current = () =>
          pendingOpeningRef.current === pending && !signal.aborted && scopeRef.current === scope
        const begin = () => {
          if (!current()) return
          if (request.destination.kind === "review") {
            actions.navigate("reviews")
            actions.setNotificationsOpen(false)
            setReviewOpeningRequest({
              scope,
              request: {
                requestId: request.requestId,
                reviewId: request.destination.reviewId,
                anchor: request.destination.anchor,
              },
            })
            return
          }
          actions.navigate("messages")
          actions.setNotificationsOpen(false)
          setInquiryOpeningRequest({
            scope,
            request: {
              requestId: request.requestId,
              inquiryId: request.destination.inquiryId,
              anchor: request.destination.anchor,
            },
          })
        }
        requestDeparture("destination", begin, cancel)
      })
    },
    [actions, cancelOpening, requestDeparture, scope, model.supportOpen, model.profileTaskOpen],
  )

  const selectLocation = (locationId: ClinicDashboardLocationId) => {
    if (locationId === selectedLocation.id) return
    const nextLocation = getClinicDashboardLocation(workspaceInput.locations, locationId)

    requestDeparture("context-change", () => {
      cancelOpening()
      setGalleryProjection(undefined)
      actions.selectLocation(locationId, nextLocation.name)
    })
  }

  const openProfileDestination = (destination: ClinicProfileFocusTarget) => {
    cancelOpening()
    actions.navigateToProfileTarget(destination)
  }

  return (
    <ClinicDashboardShell
      accountMenu={
        <AccountMenu
          email={authenticatedContext.principal.email}
          initials={accountInitials || "CS"}
          name={authenticatedContext.principal.displayName}
          onSignOut={signOut}
          role="Clinic staff"
        />
      }
      activeSection={activeSection}
      environmentBadge={reportingDemo ? "Reporting demo" : undefined}
      clinicIdentity={
        <ClinicLocationSelector
          canSwitchLocations={reportingDemo !== undefined && capabilities.canSwitchLocations}
          isDemoData={reportingDemo !== undefined}
          locations={clinicLocations}
          onValueChange={selectLocation}
          organizationName={reportingDemo ? workspaceInput.organization.name : "Authorized clinic"}
          value={reportingDemo ? selectedLocation.id : authenticatedContext.clinic.id}
        />
      }
      headerActions={
        activeSection === "dashboard" ? (
          reportingDemo ? (
            <DashboardPeriodControl
              value={demo.model.reportingPeriod}
              onValueChange={demo.actions.changeReportingPeriod}
            />
          ) : (
            <ReportingPeriodControl
              disabled={dashboard.model.reportingStatus === "loading"}
              value={dashboard.model.periodDays}
              onValueChange={dashboard.actions.changePeriodDays}
            />
          )
        ) : undefined
      }
      interfaceModeControls={
        showPrototypeModeToggle
          ? {
              desktop: (
                <PrototypeModeSwitch
                  checked={model.activePrototypeMode === "visual-reference"}
                  layout="compact"
                  onCheckedChange={actions.setShowFullInterface}
                />
              ),
              mobile: (
                <PrototypeModeSwitch
                  checked={model.activePrototypeMode === "visual-reference"}
                  onCheckedChange={actions.setShowFullInterface}
                />
              ),
            }
          : undefined
      }
      items={navigationItems}
      inquiryUnreadCount={inquiryUnreadCount}
      notificationCenter={
        <NotificationCenter
          key={`${authenticatedContext.principal.id}:${authenticatedContext.clinic.id}`}
          commands={notificationCommands}
          initialState={initialNotifications}
          onOpenChange={actions.setNotificationsOpen}
          onDestinationOpen={openNotificationDestination}
          open={model.notificationsOpen}
        />
      }
      onSectionSelect={(section) =>
        requestDeparture("section", () => {
          cancelOpening()
          actions.navigate(section)
        })
      }
      onSupportRequest={
        capabilities.showSupport
          ? () => {
              cancelOpening()
              actions.openSupport()
            }
          : undefined
      }
    >
      <p aria-live="polite" className="sr-only" role="status">
        {model.locationAnnouncement}
      </p>

      {activeSection === "dashboard" ? (
        demo.model.viewModel ? (
          <div className="space-y-6">
            <p className="border-l-4 border-[var(--border)] bg-[color-mix(in_srgb,var(--warning)_35%,var(--background))] p-4 text-sm">
              Reporting demo. Sample measurements, charts and downloads are illustrative.
            </p>
            <DashboardScreen
              model={demo.model.viewModel}
              canDownloadProfileViews
              actions={{
                onMetricSelect: demo.actions.selectMetric,
                onProfileViewsDownload: demo.actions.exportProfileViews,
                onProfileTaskOpen: actions.openProfileTask,
                onProfileProgressRetry: onSourceRefresh,
                onReviewsOpen: actions.navigateToReviews,
              }}
            />
          </div>
        ) : (
          <DashboardOverviewScreen
            model={dashboard.model}
            onMetricSelect={dashboard.actions.selectMetric}
            onProfileTaskOpen={actions.openProfileTask}
            onProfileProgressRetry={onSourceRefresh}
            onReportingRetry={() => void dashboard.actions.changePeriodDays(dashboard.model.periodDays)}
            onReviewsOpen={() =>
              requestDeparture("section", () => {
                cancelOpening()
                actions.navigateToReviews()
              })
            }
          />
        )
      ) : null}
      <div hidden={activeSection !== "messages"}>
        <InquiryQueue
          commands={inquiryCommands}
          key={scope}
          openingRequest={inquiryOpeningRequest?.scope === scope ? inquiryOpeningRequest.request : undefined}
          onOpeningResult={onInquiryOpeningResult}
          focusHeading={model.messageFocusTarget === "heading"}
          focusInquiryId={focusInquiryId}
          isActive={activeSection === "messages"}
          onDraftPresenceChange={setHasUnsavedInquiryDrafts}
          onNavigationRequestChange={setInquiryRequest}
          onFocusHandled={actions.clearMessageFocusRequest}
          onSessionLost={handleInquirySessionLoss}
          onUnreadCountChange={setInquiryUnreadCount}
          snapshot={workspaceInput.inquiryQueue}
        />
      </div>
      <div hidden={activeSection !== "reviews"}>
        <Reviews
          key={scope}
          isActive={activeSection === "reviews"}
          openingRequest={reviewOpeningRequest?.scope === scope ? reviewOpeningRequest.request : undefined}
          onOpeningResult={onReviewOpeningResult}
          onSessionLost={handleInquirySessionLoss}
          onNavigationRequestChange={setReviewRequest}
          commands={reviewCommands}
          focusTarget={model.reviewFocusTarget}
          onFocusHandled={actions.clearReviewFocusRequest}
          showManagement={capabilities.canManageReviews}
          snapshot={workspaceInput.reviewSourceSnapshot}
        />
      </div>
      <div hidden={activeSection !== "profile"}>
        <ClinicProfile
          onNavigationRequestChange={setProfileRequest}
          galleryCommands={clinicGalleryCommands}
          galleryManagement={galleryManagement}
          galleryStatus={effectiveGalleryStatus}
          gallerySnapshot={effectiveGallerySnapshot}
          doctorCommands={doctorProfileCommands}
          doctorDirectory={doctorDirectoryProjection ?? workspaceInput.doctorDirectory}
          doctorManagement={capabilities.teamManagement}
          focusTarget={model.profileFocusTarget}
          initialDialog={
            model.locationChangeCount === 0 && start.dialog === "treatment" ? start.dialog : undefined
          }
          key={selectedLocation.id}
          onFocusHandled={actions.clearProfileFocusRequest}
          onGallerySaved={(snapshot) => {
            setGalleryProjection(snapshot)
            onSourceRefresh()
          }}
          onGalleryNavigationRequestChange={setGalleryRequest}
          onDoctorsChange={(doctors) => {
            const source = doctorDirectoryProjection ?? workspaceInput.doctorDirectory
            if (source.status !== "ready") return
            setDoctorDirectoryProjection({ ...source, doctors })
          }}
          onSourceProfileChanged={onSourceRefresh}
          onTreatmentSaved={onSourceRefresh}
          onTreatmentMissing={capabilities.showSupport ? actions.openSupport : undefined}
          sourceProfileManagement={sourceProfileManagement}
          sourceCommands={clinicProfileSourceCommands}
          sourceSnapshot={workspaceInput.profileSourceSnapshot}
          treatmentCommands={clinicTreatmentCommands}
          treatmentManagement={treatmentManagement}
          treatmentSnapshot={workspaceInput.treatmentSnapshot}
        />
      </div>
      {activeSection === "subscriptions" && capabilities.showSubscriptionsPlaceholder ? (
        <FutureAreaPlaceholderScreen
          description="This area is a visual placeholder only. Subscription details and actions are not available in this demo."
          heading="Subscriptions"
        />
      ) : null}
      {activeSection === "certificates-accreditations" &&
      capabilities.showCertificatesAccreditationsPlaceholder ? (
        <FutureAreaPlaceholderScreen
          description="This area is a visual placeholder only. Certificate and accreditation details and actions are not available in this demo."
          heading="Certificates and accreditations"
        />
      ) : null}

      {model.selectedProfileTask ? (
        <ProfileTaskDialog
          onOpenChange={actions.setProfileTaskOpen}
          onProfileDestinationOpen={openProfileDestination}
          open={model.profileTaskOpen}
          task={model.selectedProfileTask}
        />
      ) : null}
      {capabilities.showSupport && model.supportOpen ? (
        <SupportRequestDialog onOpenChange={actions.setSupportOpen} open />
      ) : null}
    </ClinicDashboardShell>
  )
}
