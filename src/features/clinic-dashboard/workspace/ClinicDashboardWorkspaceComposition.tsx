"use client"

import { useCallback, useRef, useState } from "react"
import {
  submitClinicDashboardAuthAction,
  type AuthenticatedClinicContext,
} from "@/features/clinic-dashboard/auth/public"
import {
  ClinicProfile,
  type ClinicProfileCommands,
  type ClinicGalleryCommands,
  type ClinicGallerySnapshot,
  type ClinicProfileDraft,
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
  type DashboardSnapshot,
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
  clinicProfileCommands: ClinicProfileCommands
  clinicGalleryCommands: ClinicGalleryCommands
  clinicProfileSourceCommands: ClinicProfileSourceCommands
  clinicTreatmentCommands: ClinicTreatmentCommands
  doctorProfileCommands: DoctorProfileCommands
  initialNotificationReadIds?: readonly string[]
  initialNotificationsOpen?: boolean
  initialReportingPeriod?: DashboardReportingPeriod
  persistNotificationReadStateInSession: boolean
  prototypeMode: ClinicDashboardPrototypeMode
  projectDashboardAfterProfileSave: (
    input: Readonly<{
      initialProfile: ClinicProfileDraft
      locationId: string
      savedProfile: ClinicProfileDraft
      snapshot: DashboardSnapshot
    }>,
  ) => DashboardSnapshot
  reviewCommands: ReviewSourceCommands
  showPrototypeModeToggle: boolean
  start?: ClinicDashboardWorkspaceStartState
  workspaceInput: ClinicDashboardWorkspaceInput
}>

export function ClinicDashboardWorkspaceComposition({
  authenticatedContext,
  clinicProfileCommands,
  clinicGalleryCommands,
  clinicProfileSourceCommands,
  clinicTreatmentCommands,
  doctorProfileCommands,
  initialNotificationReadIds = [],
  initialNotificationsOpen = false,
  initialReportingPeriod = "30 days",
  persistNotificationReadStateInSession,
  prototypeMode,
  projectDashboardAfterProfileSave,
  reviewCommands,
  showPrototypeModeToggle,
  start = {},
  workspaceInput,
}: ClinicDashboardWorkspaceCompositionProps) {
  const [savedProfileProjection, setSavedProfileProjection] = useState<
    Readonly<{ locationId: string; profile: ClinicProfileDraft }> | undefined
  >()
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
  const defaultSnapshot = getClinicDashboardLocationSnapshot(workspaceInput, workspaceInput.defaultLocationId)
  const initialProfileTask = defaultSnapshot.dashboard.profileTasks[0]
  if (!initialProfileTask) throw new Error("The clinic dashboard requires at least one profile task.")

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
  const profileProjection =
    savedProfileProjection?.locationId === selectedLocation.id
      ? savedProfileProjection.profile
      : selectedSnapshot.clinicProfile
  const effectiveGallerySnapshot = galleryProjection ?? workspaceInput.gallerySnapshot
  const effectiveGalleryStatus = galleryProjection ? "ready" : workspaceInput.galleryStatus
  const selectedProfile =
    effectiveGallerySnapshot || effectiveGalleryStatus !== "ready"
      ? {
          ...profileProjection,
          gallery:
            effectiveGallerySnapshot?.items.slice(0, 4).map((item, index) => ({
              alt: item.alt,
              id: item.id,
              isCover: index === 0,
              src: item.thumbnailUrl ?? item.url,
            })) ?? [],
          galleryTotal: effectiveGallerySnapshot?.items.length ?? 0,
        }
      : profileProjection
  const profileProjectedDashboard =
    savedProfileProjection?.locationId === selectedLocation.id
      ? projectDashboardAfterProfileSave({
          initialProfile: selectedSnapshot.clinicProfile,
          locationId: selectedLocation.id,
          savedProfile: savedProfileProjection.profile,
          snapshot: selectedSnapshot.dashboard,
        })
      : selectedSnapshot.dashboard
  const projectedDashboardSnapshot =
    effectiveGallerySnapshot && effectiveGallerySnapshot.items.length > 0
      ? projectDashboardAfterProfileSave({
          initialProfile: selectedSnapshot.clinicProfile,
          locationId: selectedLocation.id,
          savedProfile: selectedProfile,
          snapshot: profileProjectedDashboard,
        })
      : profileProjectedDashboard
  const coverImage = selectedProfile.gallery.find((image) => image.isCover) ?? selectedProfile.gallery[0]

  const dashboardController = useDashboardController({
    canExportProfileViews: capabilities.canUseDashboardReporting,
    initialReportingPeriod,
    locationSummary: {
      ...(coverImage ? { coverAlt: coverImage.alt, coverImage: coverImage.src } : {}),
      location: selectedLocation.location,
      name: selectedProfile.name,
    },
    snapshot: projectedDashboardSnapshot,
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
    const nextSnapshot = getClinicDashboardLocationSnapshot(workspaceInput, locationId)
    const nextProfileTask = nextSnapshot.dashboard.profileTasks[0]
    if (!nextProfileTask) throw new Error(`Clinic location ${locationId} requires a profile task.`)

    continueAfterGalleryGuard(() => {
      setSavedProfileProjection(undefined)
      setGalleryProjection(undefined)
      actions.selectLocation(locationId, nextLocation.name, nextProfileTask)
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
              const nextSnapshot = getClinicDashboardLocationSnapshot(workspaceInput, notification.locationId)
              const nextProfileTask = nextSnapshot.dashboard.profileTasks[0]
              if (!nextProfileTask) {
                throw new Error(`Clinic location ${notification.locationId} requires a profile task.`)
              }
              continueAfterGalleryGuard(() => {
                setSavedProfileProjection(undefined)
                setGalleryProjection(undefined)
                actions.openNotification(notification, nextLocation.name, nextProfileTask)
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
        <strong className="text-[var(--secondary)]">Mixed data.</strong> Profile details, doctors, clinic
        treatments, gallery, patient inquiries and reviews are live. Dashboard cards and charts are local
        examples.
      </div>

      {activeSection === "dashboard" ? (
        <DashboardScreen
          actions={{
            onMetricSelect: dashboardController.actions.selectMetric,
            onProfileTaskOpen: actions.openProfileTask,
            onProfileViewsDownload: dashboardController.actions.exportProfileViews,
            onReviewsOpen: actions.navigateToReviews,
          }}
          canDownloadProfileViews={capabilities.canUseDashboardReporting}
          model={dashboardController.model.viewModel}
          showCertificateTasks={capabilities.showCertificateTasks}
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
          commands={clinicProfileCommands}
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
          initialProfile={selectedProfile}
          key={selectedLocation.id}
          onFocusHandled={actions.clearProfileFocusRequest}
          onGallerySaved={setGalleryProjection}
          onGalleryNavigationRequestChange={setGalleryNavigationRequest}
          onDoctorsChange={(doctors) => {
            const source = doctorDirectoryProjection ?? workspaceInput.doctorDirectory
            if (source.status !== "ready") return
            setDoctorDirectoryProjection({ ...source, doctors })
          }}
          onProfileSaved={(profile) =>
            setSavedProfileProjection({ locationId: selectedLocation.id, profile })
          }
          onTreatmentMissing={capabilities.showSupport ? actions.openSupport : undefined}
          profileManagement={capabilities.profileManagement}
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

      <ProfileTaskDialog
        onOpenChange={actions.setProfileTaskOpen}
        onProfileDestinationOpen={openProfileDestination}
        open={model.profileTaskOpen}
        task={model.selectedProfileTask}
      />
      {capabilities.showSupport && model.supportOpen ? (
        <SupportRequestDialog onOpenChange={actions.setSupportOpen} open />
      ) : null}
    </ClinicDashboardShell>
  )
}
