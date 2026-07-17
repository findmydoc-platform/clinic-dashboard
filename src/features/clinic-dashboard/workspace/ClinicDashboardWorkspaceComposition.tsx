"use client"

import type { StaticImageData } from "next/image"
import {
  ClinicProfile,
  type ClinicProfileCommands,
  type ClinicProfileDraft,
  type ClinicProfileFocusTarget,
  type MasterTreatment,
} from "@/features/clinic-dashboard/clinic-profile/public"
import {
  DashboardPeriodControl,
  DashboardScreen,
  ProfileTaskDialog,
  type DashboardReportingPeriod,
  type DashboardSnapshot,
  useDashboardController,
} from "@/features/clinic-dashboard/dashboard/public"
import {
  MessagesScreen,
  PatientInquiryProfileDialog,
  type MessagesSnapshot,
  type PatientInquiryProfile,
  useMessagesController,
} from "@/features/clinic-dashboard/messages/public"
import {
  getClinicDashboardCapabilities,
  isClinicDashboardPrototypeMode,
  PrototypeModeSwitch,
  type ClinicDashboardPrototypeMode,
} from "@/features/clinic-dashboard/prototype/public"
import {
  Reviews,
  type ReviewCommands,
  type ReviewsSnapshot,
} from "@/features/clinic-dashboard/reviews/public"
import { SupportRequestDialog } from "@/features/clinic-dashboard/support/public"
import { ClinicDashboardShell } from "./ClinicDashboardShell"
import { AccountMenu } from "./components/molecules/AccountMenu"
import { ClinicLocationSelector } from "./components/molecules/ClinicLocationSelector"
import { FutureAreaPlaceholderScreen } from "./components/organisms/FutureAreaPlaceholderScreen"
import { NotificationCenter } from "./components/organisms/NotificationCenter"
import {
  defaultClinicDashboardLocationId,
  getClinicDashboardPrototypeLocation,
  type ClinicDashboardPrototypeLocation,
} from "./model/locations"
import type { ClinicDashboardNotification } from "./model/notifications"
import type { ClinicDashboardDialog, ClinicDashboardSection } from "./model/workspace"
import { selectClinicDashboardNavigationItems, selectSafeClinicDashboardSection } from "./navigation"
import { useClinicDashboardController } from "./useClinicDashboardController"

export type ClinicDashboardWorkspaceSnapshot = Readonly<{
  account: Readonly<{
    avatar?: StaticImageData | string
    initials: string
    name: string
    role: string
  }>
  clinicProfile: ClinicProfileDraft
  dashboard: DashboardSnapshot
  locations: readonly ClinicDashboardPrototypeLocation[]
  messages: MessagesSnapshot
  notifications: readonly ClinicDashboardNotification[]
  patientInquiry: PatientInquiryProfile
  reviews: ReviewsSnapshot
  treatmentCatalogue: readonly MasterTreatment[]
}>

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
  snapshot: ClinicDashboardWorkspaceSnapshot
  start?: ClinicDashboardWorkspaceStartState
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
  snapshot,
  start = {},
}: ClinicDashboardWorkspaceCompositionProps) {
  if (!isClinicDashboardPrototypeMode(prototypeMode)) {
    throw new Error(`Unsupported clinic dashboard prototype mode: ${prototypeMode}`)
  }

  const initialProfileTask = snapshot.dashboard.profileTasks[0]
  if (!initialProfileTask) throw new Error("The clinic dashboard requires at least one profile task.")

  const controller = useClinicDashboardController({
    initialNotificationReadIds,
    initialNotificationsOpen,
    initialPatientInquiryOpen: start.dialog === "patient-inquiry",
    initialLocationId: defaultClinicDashboardLocationId,
    initialProfileTask,
    initialSection: start.section ?? "dashboard",
    notifications: snapshot.notifications,
    persistWorkspaceStateInSession,
    prototypeMode,
  })
  const { actions, model } = controller
  const capabilities = getClinicDashboardCapabilities(model.activePrototypeMode)
  const navigationItems = selectClinicDashboardNavigationItems({
    showSubscriptionsPlaceholder: capabilities.showSubscriptionsPlaceholder,
  })
  const activeSection = selectSafeClinicDashboardSection(model.activeSection, navigationItems)
  const selectedLocation = getClinicDashboardPrototypeLocation(
    snapshot.locations,
    capabilities.canSwitchLocations ? model.selectedLocationId : defaultClinicDashboardLocationId,
  )
  const dashboardController = useDashboardController({
    canExportProfileViews: capabilities.canUseDashboardReporting,
    initialReportingPeriod,
    locationSummary: {
      location: selectedLocation.location,
      name: selectedLocation.name,
    },
    snapshot: snapshot.dashboard,
  })
  const messagesController = useMessagesController({
    isInteractive: capabilities.canUseMessaging,
    snapshot: snapshot.messages,
  })

  const openProfileDestination = (destination: ClinicProfileFocusTarget) => {
    actions.navigateToProfileTarget(destination)
  }

  return (
    <ClinicDashboardShell
      accountMenu={
        <AccountMenu
          avatar={snapshot.account.avatar}
          initials={snapshot.account.initials}
          name={snapshot.account.name}
          role={snapshot.account.role}
        />
      }
      activeSection={activeSection}
      clinicName={selectedLocation.name}
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
      locationSelector={
        capabilities.canSwitchLocations ? (
          <ClinicLocationSelector
            locations={snapshot.locations}
            onValueChange={actions.selectLocation}
            value={model.selectedLocationId}
          />
        ) : undefined
      }
      notificationCenter={
        capabilities.showNotifications ? (
          <NotificationCenter
            notifications={snapshot.notifications}
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
      {activeSection === "messages" ? (
        <MessagesScreen
          actions={{
            ...messagesController.actions,
            onPatientInquiryOpen: actions.openPatientInquiry,
          }}
          model={messagesController.model}
        />
      ) : null}
      <div hidden={activeSection !== "reviews"}>
        <Reviews
          commands={reviewCommands}
          focusHeading={model.reviewsFocusRequested}
          onFocusHandled={actions.clearReviewsFocusRequest}
          showManagement={capabilities.canManageReviews}
          snapshot={snapshot.reviews}
        />
      </div>
      <div hidden={activeSection !== "profile"}>
        <ClinicProfile
          commands={clinicProfileCommands}
          focusTarget={model.profileFocusTarget}
          initialDialog={
            start.dialog === "team-member" || start.dialog === "treatment" ? start.dialog : undefined
          }
          initialProfile={snapshot.clinicProfile}
          onFocusHandled={actions.clearProfileFocusRequest}
          onTreatmentMissing={capabilities.showSupport ? actions.openSupport : undefined}
          profileManagement={capabilities.profileManagement}
          teamManagement={capabilities.teamManagement}
          treatmentCatalogue={snapshot.treatmentCatalogue}
        />
      </div>
      {activeSection === "subscriptions" && capabilities.showSubscriptionsPlaceholder ? (
        <FutureAreaPlaceholderScreen
          description="This area is a visual placeholder only. Subscription details and actions are not available in this prototype."
          heading="Subscriptions"
        />
      ) : null}

      <PatientInquiryProfileDialog
        canViewDetailedInquiry={capabilities.canViewDetailedPatientInquiry}
        onOpenChange={actions.setPatientInquiryOpen}
        open={model.patientInquiryOpen}
        patient={snapshot.patientInquiry}
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
