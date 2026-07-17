"use client"

import {
  ClinicProfile,
  type ClinicProfileFocusTarget,
} from "@/features/clinic-dashboard/clinic-profile/public"
import { clinicProfilePrototypeData } from "@/features/clinic-dashboard/clinic-profile/clinic-profile.prototype-data"
import {
  DashboardPeriodControl,
  DashboardScreen,
  ProfileTaskDialog,
  type DashboardReportingPeriod,
  useDashboardController,
} from "@/features/clinic-dashboard/dashboard/public"
import { dashboardPrototypeData } from "@/features/clinic-dashboard/dashboard/dashboard.prototype-data"
import {
  MessagesScreen,
  PatientInquiryProfileDialog,
  useMessagesController,
} from "@/features/clinic-dashboard/messages/public"
import {
  messagesPrototypeData,
  patientInquiryPrototypeData,
} from "@/features/clinic-dashboard/messages/messages.prototype-data"
import { Reviews } from "@/features/clinic-dashboard/reviews/public"
import { reviewsPrototypeData } from "@/features/clinic-dashboard/reviews/reviews.prototype-data"
import { SupportRequestDialog } from "@/features/clinic-dashboard/support/public"
import { ClinicDashboardShell } from "./ClinicDashboardShell"
import { useClinicDashboardController } from "./useClinicDashboardController"
import { AccountMenu } from "./components/molecules/AccountMenu"
import { NotificationCenter } from "./components/organisms/NotificationCenter"
import { clinicDashboardNavigationItems } from "./navigation"
import type { ClinicDashboardDialog, ClinicDashboardSection } from "./model/workspace"
import { clinicDashboardWorkspacePrototypeData } from "./workspace.prototype-data"
import { PrototypeModeSwitch } from "../prototype/components/molecules/PrototypeModeSwitch"
import {
  clinicDashboardPrototypeCommands,
  type ClinicDashboardPrototypeCommands,
} from "../prototype/prototype-commands"
import {
  getClinicDashboardCapabilities,
  isClinicDashboardPrototypeMode,
  type ClinicDashboardPrototypeMode,
} from "../prototype/public"

export type ClinicDashboardWorkspaceProps = Readonly<{
  commands?: ClinicDashboardPrototypeCommands
  initialDialog?: ClinicDashboardDialog
  initialNotificationReadIds?: readonly string[]
  initialNotificationsOpen?: boolean
  initialReportingPeriod?: DashboardReportingPeriod
  initialSection?: ClinicDashboardSection
  persistWorkspaceStateInSession?: boolean
  prototypeMode: ClinicDashboardPrototypeMode
  showPrototypeModeToggle?: boolean
}>

const initialProfileTask = dashboardPrototypeData.profileTasks[0]

if (!initialProfileTask) throw new Error("The clinic dashboard requires at least one profile task.")

export function ClinicDashboardWorkspace({
  commands = clinicDashboardPrototypeCommands,
  initialDialog,
  initialNotificationReadIds = [],
  initialNotificationsOpen = false,
  initialReportingPeriod = "30 days",
  initialSection = "dashboard",
  persistWorkspaceStateInSession = false,
  prototypeMode,
  showPrototypeModeToggle = false,
}: ClinicDashboardWorkspaceProps) {
  if (!isClinicDashboardPrototypeMode(prototypeMode)) {
    throw new Error(`Unsupported clinic dashboard prototype mode: ${prototypeMode}`)
  }

  const controller = useClinicDashboardController({
    initialNotificationReadIds,
    initialNotificationsOpen,
    initialPatientInquiryOpen: initialDialog === "patient-inquiry",
    initialProfileTask,
    initialSection,
    notifications: clinicDashboardWorkspacePrototypeData.notifications,
    persistWorkspaceStateInSession,
    prototypeMode,
  })
  const { actions, model } = controller
  const capabilities = getClinicDashboardCapabilities(model.activePrototypeMode)
  const dashboardController = useDashboardController({
    canExportProfileViews: capabilities.canUseDashboardReporting,
    data: dashboardPrototypeData,
    initialReportingPeriod,
  })
  const messagesController = useMessagesController({
    data: messagesPrototypeData,
    isInteractive: capabilities.canUseMessaging,
  })

  const openProfileDestination = (destination: ClinicProfileFocusTarget) => {
    actions.navigateToProfileTarget(destination)
  }

  return (
    <ClinicDashboardShell
      accountMenu={
        <AccountMenu
          avatar={clinicDashboardWorkspacePrototypeData.account.avatar}
          initials={clinicDashboardWorkspacePrototypeData.account.initials}
          name={clinicDashboardWorkspacePrototypeData.account.name}
          role={clinicDashboardWorkspacePrototypeData.account.role}
        />
      }
      activeSection={model.activeSection}
      clinicName={clinicDashboardWorkspacePrototypeData.clinicName}
      headerActions={
        model.activeSection === "dashboard" && capabilities.canUseDashboardReporting ? (
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
      items={clinicDashboardNavigationItems}
      notificationCenter={
        capabilities.showNotifications ? (
          <NotificationCenter
            notifications={clinicDashboardWorkspacePrototypeData.notifications}
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
      {model.activeSection === "dashboard" ? (
        <DashboardScreen
          actions={{
            onProfileTaskOpen: actions.openProfileTask,
            onProfileViewsDownload: dashboardController.actions.exportProfileViews,
            onReviewsOpen: actions.navigateToReviews,
          }}
          canDownloadProfileViews={capabilities.canUseDashboardReporting}
          model={dashboardController.model.viewModel}
          period={dashboardController.model.reportingPeriod}
          showCertificateTasks={capabilities.showCertificateTasks}
        />
      ) : null}
      {model.activeSection === "messages" ? (
        <MessagesScreen
          actions={{
            ...messagesController.actions,
            onPatientInquiryOpen: actions.openPatientInquiry,
          }}
          model={messagesController.model}
        />
      ) : null}
      <div hidden={model.activeSection !== "reviews"}>
        <Reviews
          commands={commands}
          data={reviewsPrototypeData}
          focusHeading={model.reviewsFocusRequested}
          onFocusHandled={actions.clearReviewsFocusRequest}
          showManagement={capabilities.canManageReviews}
        />
      </div>
      <div hidden={model.activeSection !== "profile"}>
        <ClinicProfile
          canManageProfile={capabilities.canManageProfile}
          canManageTeam={capabilities.canManageTeam}
          commands={commands}
          focusTarget={model.profileFocusTarget}
          initialDialog={
            initialDialog === "team-member" || initialDialog === "treatment" ? initialDialog : undefined
          }
          initialProfile={clinicProfilePrototypeData}
          onFocusHandled={actions.clearProfileFocusRequest}
          showProfileManagement={capabilities.showProfileManagement}
          showTeamManagement={capabilities.showTeamManagement}
        />
      </div>

      <PatientInquiryProfileDialog
        canViewDetailedInquiry={capabilities.canViewDetailedPatientInquiry}
        onOpenChange={actions.setPatientInquiryOpen}
        open={model.patientInquiryOpen}
        patient={patientInquiryPrototypeData}
      />
      <ProfileTaskDialog
        onOpenChange={actions.setProfileTaskOpen}
        onProfileDestinationOpen={openProfileDestination}
        open={model.profileTaskOpen}
        task={model.selectedProfileTask}
      />
      {capabilities.showSupport && model.supportOpen ? (
        <SupportRequestDialog commands={commands} onOpenChange={actions.setSupportOpen} open />
      ) : null}
    </ClinicDashboardShell>
  )
}
