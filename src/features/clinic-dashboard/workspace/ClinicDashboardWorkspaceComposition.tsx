"use client"

import {
  ClinicProfile,
  type ClinicProfileCommands,
  type ClinicProfileFocusTarget,
} from "@/features/clinic-dashboard/clinic-profile/public"
import {
  DashboardPeriodControl,
  DashboardScreen,
  ProfileTaskDialog,
  type DashboardReportingPeriod,
  useDashboardController,
} from "@/features/clinic-dashboard/dashboard/public"
import { Messages, PatientInquiryProfileDialog } from "@/features/clinic-dashboard/messages/public"
import {
  getClinicDashboardCapabilities,
  isClinicDashboardPrototypeMode,
  PrototypeModeSwitch,
  type ClinicDashboardPrototypeMode,
} from "@/features/clinic-dashboard/prototype/public"
import { Reviews, type ReviewCommands } from "@/features/clinic-dashboard/reviews/public"
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
      dialog: Extract<ClinicDashboardDialog, "team-member" | "treatment">
      section: Extract<ClinicDashboardSection, "profile">
    }>

type ClinicDashboardWorkspaceCompositionProps = Readonly<{
  clinicProfileCommands: ClinicProfileCommands
  initialNotificationReadIds?: readonly string[]
  initialNotificationsOpen?: boolean
  initialReportingPeriod?: DashboardReportingPeriod
  persistWorkspaceStateInSession: boolean
  prototypeMode: ClinicDashboardPrototypeMode
  reviewCommands: ReviewCommands
  showPrototypeModeToggle: boolean
  start?: ClinicDashboardWorkspaceStartState
  workspaceInput: ClinicDashboardWorkspaceInput
}>

export function ClinicDashboardWorkspaceComposition({
  clinicProfileCommands,
  initialNotificationReadIds = [],
  initialNotificationsOpen = false,
  initialReportingPeriod = "30 days",
  persistWorkspaceStateInSession,
  prototypeMode,
  reviewCommands,
  showPrototypeModeToggle,
  start = {},
  workspaceInput,
}: ClinicDashboardWorkspaceCompositionProps) {
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
    initialPatientInquiryOpen: start.dialog === "patient-inquiry",
    initialProfileTask,
    initialSection: start.section ?? "dashboard",
    notifications: workspaceInput.notifications,
    persistWorkspaceStateInSession,
    prototypeMode,
  })
  const { actions, model } = controller
  const capabilities = getClinicDashboardCapabilities(model.activePrototypeMode)
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
  const coverImage =
    selectedSnapshot.clinicProfile.gallery.find((image) => image.isCover) ??
    selectedSnapshot.clinicProfile.gallery[0]
  if (!coverImage) throw new Error(`Clinic location ${selectedLocation.id} requires a cover image.`)

  const dashboardController = useDashboardController({
    canExportProfileViews: capabilities.canUseDashboardReporting,
    initialReportingPeriod,
    locationSummary: {
      coverAlt: coverImage.alt,
      coverImage: coverImage.src,
      location: selectedLocation.location,
      name: selectedLocation.name,
    },
    snapshot: selectedSnapshot.dashboard,
  })

  const selectLocation = (locationId: ClinicDashboardLocationId) => {
    const nextLocation = getClinicDashboardLocation(workspaceInput.locations, locationId)
    const nextSnapshot = getClinicDashboardLocationSnapshot(workspaceInput, locationId)
    const nextProfileTask = nextSnapshot.dashboard.profileTasks[0]
    if (!nextProfileTask) throw new Error(`Clinic location ${locationId} requires a profile task.`)

    actions.selectLocation(locationId, nextLocation.name, nextProfileTask)
  }

  const openProfileDestination = (destination: ClinicProfileFocusTarget) => {
    actions.navigateToProfileTarget(destination)
  }

  return (
    <ClinicDashboardShell
      accountMenu={
        <AccountMenu
          avatar={workspaceInput.account.avatar}
          initials={workspaceInput.account.initials}
          name={workspaceInput.account.name}
          role={workspaceInput.account.role}
        />
      }
      activeSection={activeSection}
      clinicIdentity={
        <ClinicLocationSelector
          canSwitchLocations={capabilities.canSwitchLocations}
          locations={workspaceInput.locations}
          onValueChange={selectLocation}
          organizationName={workspaceInput.organization.name}
          value={selectedLocation.id}
        />
      }
      environmentBadge="Demo"
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
            onOpenChange={actions.setNotificationsOpen}
            open={model.notificationsOpen}
            readNotificationIds={model.notificationReadIds}
          />
        ) : undefined
      }
      onSectionSelect={actions.navigate}
      onSupportRequest={capabilities.showSupport ? actions.openSupport : undefined}
    >
      <p aria-live="polite" className="sr-only" role="status">
        {model.locationAnnouncement}
      </p>

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
        <Messages
          isInteractive={capabilities.canUseMessaging}
          key={selectedLocation.id}
          onPatientInquiryOpen={actions.openPatientInquiry}
          snapshot={selectedSnapshot.messages}
        />
      </div>
      <div hidden={activeSection !== "reviews"}>
        <Reviews
          commands={reviewCommands}
          focusHeading={model.reviewsFocusRequested}
          key={selectedLocation.id}
          onFocusHandled={actions.clearReviewsFocusRequest}
          showManagement={capabilities.canManageReviews}
          snapshot={selectedSnapshot.reviews}
        />
      </div>
      <div hidden={activeSection !== "profile"}>
        <ClinicProfile
          commands={clinicProfileCommands}
          focusTarget={model.profileFocusTarget}
          initialDialog={
            model.locationChangeCount === 0 &&
            (start.dialog === "team-member" || start.dialog === "treatment")
              ? start.dialog
              : undefined
          }
          initialProfile={selectedSnapshot.clinicProfile}
          key={selectedLocation.id}
          onFocusHandled={actions.clearProfileFocusRequest}
          onTreatmentMissing={capabilities.showSupport ? actions.openSupport : undefined}
          profileManagement={capabilities.profileManagement}
          teamManagement={capabilities.teamManagement}
          treatmentCatalogue={workspaceInput.treatmentCatalogue}
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

      <PatientInquiryProfileDialog
        canViewDetailedInquiry={capabilities.canViewDetailedPatientInquiry}
        onOpenChange={actions.setPatientInquiryOpen}
        open={model.patientInquiryOpen}
        patient={selectedSnapshot.patientInquiry}
      />
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
