"use client"

import { useCallback, useRef, useState } from "react"
import {
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
  DashboardPeriodControl,
  DashboardScreen,
  ProfileTaskDialog,
  type DashboardReportingPeriod,
  useDashboardController,
} from "@/features/clinic-dashboard/dashboard/public"
import { InquiryQueue } from "@/features/clinic-dashboard/messages/public"
import {
  getClinicDashboardDemoInteractionPolicy,
  isClinicDashboardPrototypeMode,
  PrototypeModeSwitch,
  type ClinicDashboardPrototypeMode,
} from "@/features/clinic-dashboard/prototype/public"
import { Reviews, type ReviewSourceCommands } from "@/features/clinic-dashboard/reviews/public"
import { SupportRequestDialog } from "@/features/clinic-dashboard/support/public"
import { ClinicDashboardShell } from "./ClinicDashboardShell"
import { AccountMenu } from "./components/molecules/AccountMenu"
import { ClinicLocationSelector } from "./components/molecules/ClinicLocationSelector"
import { FutureAreaPlaceholderScreen } from "./components/organisms/FutureAreaPlaceholderScreen"
import { NotificationCenter } from "./components/organisms/NotificationCenter"
import { getClinicDashboardLocation, type ClinicDashboardLocationId } from "./model/locations"
import type { ClinicDashboardDialog, ClinicDashboardSection } from "./model/workspace"
import {
  getClinicDashboardLocationSnapshot,
  type ClinicDashboardWorkspaceInput,
} from "./model/workspace-input"
import { selectClinicDashboardNavigationItems, selectSafeClinicDashboardSection } from "./navigation"
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
  initialNotificationReadIds?: readonly string[]
  initialNotificationsOpen?: boolean
  initialReportingPeriod?: DashboardReportingPeriod
  isSourceRefreshPending: boolean
  onSourceRefresh: () => void
  persistNotificationReadStateInSession: boolean
  prototypeMode: ClinicDashboardPrototypeMode
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
  initialNotificationReadIds = [],
  initialNotificationsOpen = false,
  initialReportingPeriod = "30 days",
  isSourceRefreshPending,
  onSourceRefresh,
  persistNotificationReadStateInSession,
  prototypeMode,
  reviewCommands,
  showPrototypeModeToggle,
  start = {},
  workspaceInput,
}: ClinicDashboardWorkspaceCompositionProps) {
  const [doctorDirectoryProjection, setDoctorDirectoryProjection] = useState<DoctorDirectorySnapshot>()
  const [galleryProjection, setGalleryProjection] = useState<ClinicGallerySnapshot>()
  const galleryNavigationRequestRef = useRef<((continuation: () => void) => void) | undefined>(undefined)
  const setGalleryNavigationRequest = useCallback((request?: (continuation: () => void) => void) => {
    galleryNavigationRequestRef.current = request
  }, [])
  const continueAfterGalleryGuard = useCallback((continuation: () => void) => {
    const request = galleryNavigationRequestRef.current
    if (request) request(continuation)
    else continuation()
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
    initialNotificationReadIds,
    initialNotificationsOpen,
    initialProfileTask,
    initialSection: start.section ?? "dashboard",
    notifications: workspaceInput.notifications,
    persistNotificationReadStateInSession,
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
  const coverImage = selectedProfile.gallery.find((image) => image.isCover) ?? selectedProfile.gallery[0]

  const dashboardController = useDashboardController({
    canExportProfileViews: capabilities.canUseDashboardReporting,
    initialReportingPeriod,
    locationSummary: {
      ...(coverImage ? { coverAlt: coverImage.alt, coverImage: coverImage.src } : {}),
      location: selectedLocation.location,
      name: selectedProfile.name,
    },
    profileProgress,
    snapshot: selectedSnapshot.dashboard,
  })

  const accountInitials = authenticatedContext.principal.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  const signOut = async () => {
    const result = await submitClinicDashboardAuthAction("/api/auth/logout", {})
    if (result.ok && result.body.redirectTo === "/login") {
      window.location.assign("/login")
      return { ok: true }
    }
    return { message: "Sign out failed. Please try again.", ok: false }
  }

  const selectLocation = (locationId: ClinicDashboardLocationId) => {
    const nextLocation = getClinicDashboardLocation(workspaceInput.locations, locationId)

    continueAfterGalleryGuard(() => {
      setGalleryProjection(undefined)
      actions.selectLocation(locationId, nextLocation.name)
    })
  }

  const openProfileDestination = (destination: ClinicProfileFocusTarget) => {
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
      clinicIdentity={
        <ClinicLocationSelector
          canSwitchLocations={capabilities.canSwitchLocations}
          isDemoData
          locations={workspaceInput.locations}
          onValueChange={selectLocation}
          organizationName={authenticatedContext.clinic.name}
          value={selectedLocation.id}
        />
      }
      environmentBadge="Mixed data"
      headerActions={
        activeSection === "dashboard" && capabilities.canUseDashboardReporting ? (
          <DashboardPeriodControl
            onValueChange={dashboardController.actions.changeReportingPeriod}
            value={dashboardController.model.reportingPeriod}
          />
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
      notificationCenter={
        capabilities.showNotifications ? (
          <NotificationCenter
            notifications={workspaceInput.notifications}
            onMarkAllAsRead={actions.markAllNotificationsRead}
            onNotificationOpen={(notification) => {
              const nextLocation = getClinicDashboardLocation(
                workspaceInput.locations,
                notification.locationId,
              )
              continueAfterGalleryGuard(() => {
                setGalleryProjection(undefined)
                actions.openNotification(notification, nextLocation.name)
              })
            }}
            onOpenChange={actions.setNotificationsOpen}
            open={model.notificationsOpen}
            readNotificationIds={model.notificationReadIds}
          />
        ) : undefined
      }
      onSectionSelect={(section) => continueAfterGalleryGuard(() => actions.navigate(section))}
      onSupportRequest={capabilities.showSupport ? actions.openSupport : undefined}
    >
      <p aria-live="polite" className="sr-only" role="status">
        {model.locationAnnouncement}
      </p>

      <div className="mb-5 border-l-4 border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_34%,var(--background))] px-4 py-3 text-sm leading-5">
        <strong className="text-[var(--secondary)]">Mixed data.</strong> Profile details, public profile
        progress, doctors, clinic treatments, gallery, patient inquiries and reviews are live. Performance
        cards and charts are local examples.
      </div>

      {activeSection === "dashboard" ? (
        <DashboardScreen
          actions={{
            onMetricSelect: dashboardController.actions.selectMetric,
            onProfileProgressRetry: onSourceRefresh,
            onProfileTaskOpen: actions.openProfileTask,
            onProfileViewsDownload: dashboardController.actions.exportProfileViews,
            onReviewsOpen: actions.navigateToReviews,
          }}
          canDownloadProfileViews={capabilities.canUseDashboardReporting}
          model={dashboardController.model.viewModel}
        />
      ) : null}
      <div hidden={activeSection !== "messages"}>
        <InquiryQueue
          focusHeading={model.messageFocusTarget === "heading"}
          onFocusHandled={actions.clearMessageFocusRequest}
          snapshot={workspaceInput.inquiryQueue}
        />
      </div>
      <div hidden={activeSection !== "reviews"}>
        <Reviews
          commands={reviewCommands}
          focusTarget={model.reviewFocusTarget}
          onFocusHandled={actions.clearReviewFocusRequest}
          showManagement={capabilities.canManageReviews}
          snapshot={workspaceInput.reviewSourceSnapshot}
        />
      </div>
      <div hidden={activeSection !== "profile"}>
        <ClinicProfile
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
          onGalleryNavigationRequestChange={setGalleryNavigationRequest}
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
