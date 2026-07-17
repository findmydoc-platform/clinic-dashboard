"use client"

import type { StaticImageData } from "next/image"
import {
  ClinicProfile,
  type ClinicProfileCommands,
  type ClinicProfileDraft,
  type ClinicProfileFocusTarget,
} from "@/features/clinic-dashboard/clinic-profile/public"
import {
  DashboardPeriodControl,
  DashboardScreen,
  ProfileTaskDialog,
  type DashboardReportingPeriod,
  useDashboardController,
} from "@/features/clinic-dashboard/dashboard/public"
import {
  MessagesScreen,
  PatientInquiryProfileDialog,
  type MessagesData,
  type PatientInquiryProfile,
  useMessagesController,
} from "@/features/clinic-dashboard/messages/public"
import {
  getClinicDashboardCapabilities,
  isClinicDashboardPrototypeMode,
  PrototypeModeSwitch,
  type ClinicDashboardPrototypeMode,
} from "@/features/clinic-dashboard/prototype/public"
import { Reviews, type ReviewCommands, type ReviewsData } from "@/features/clinic-dashboard/reviews/public"
import { SupportRequestDialog, type SupportCommands } from "@/features/clinic-dashboard/support/public"
import { ClinicDashboardShell } from "./ClinicDashboardShell"
import { AccountMenu } from "./components/molecules/AccountMenu"
import { NotificationCenter } from "./components/organisms/NotificationCenter"
import type { ClinicDashboardNotification } from "./model/notifications"
import type { ClinicDashboardDialog, ClinicDashboardSection } from "./model/workspace"
import { clinicDashboardNavigationItems } from "./navigation"
import { useClinicDashboardController } from "./useClinicDashboardController"

type DashboardData = Parameters<typeof useDashboardController>[0]["data"]

export type ClinicDashboardWorkspaceCompositionData = Readonly<{
  account: Readonly<{
    avatar?: StaticImageData | string
    initials: string
    name: string
    role: string
  }>
  clinicName: string
  clinicProfile: ClinicProfileDraft
  dashboard: DashboardData
  messages: MessagesData
  notifications: readonly ClinicDashboardNotification[]
  patientInquiry: PatientInquiryProfile
  reviews: ReviewsData
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
  data: ClinicDashboardWorkspaceCompositionData
  initialNotificationReadIds?: readonly string[]
  initialNotificationsOpen?: boolean
  initialReportingPeriod?: DashboardReportingPeriod
  persistWorkspaceStateInSession: boolean
  prototypeMode: ClinicDashboardPrototypeMode
  reviewCommands: ReviewCommands
  showPrototypeModeToggle: boolean
  start?: ClinicDashboardWorkspaceStartState
  supportCommands: SupportCommands
}>

export function ClinicDashboardWorkspaceComposition({
  clinicProfileCommands,
  data,
  initialNotificationReadIds = [],
  initialNotificationsOpen = false,
  initialReportingPeriod = "30 days",
  persistWorkspaceStateInSession,
  prototypeMode,
  reviewCommands,
  showPrototypeModeToggle,
  start = {},
  supportCommands,
}: ClinicDashboardWorkspaceCompositionProps) {
  if (!isClinicDashboardPrototypeMode(prototypeMode)) {
    throw new Error(`Unsupported clinic dashboard prototype mode: ${prototypeMode}`)
  }

  const initialProfileTask = data.dashboard.profileTasks[0]
  if (!initialProfileTask) throw new Error("The clinic dashboard requires at least one profile task.")

  const controller = useClinicDashboardController({
    initialNotificationReadIds,
    initialNotificationsOpen,
    initialPatientInquiryOpen: start.dialog === "patient-inquiry",
    initialProfileTask,
    initialSection: start.section ?? "dashboard",
    notifications: data.notifications,
    persistWorkspaceStateInSession,
    prototypeMode,
  })
  const { actions, model } = controller
  const capabilities = getClinicDashboardCapabilities(model.activePrototypeMode)
  const dashboardController = useDashboardController({
    canExportProfileViews: capabilities.canUseDashboardReporting,
    data: data.dashboard,
    initialReportingPeriod,
  })
  const messagesController = useMessagesController({
    data: data.messages,
    isInteractive: capabilities.canUseMessaging,
  })

  const openProfileDestination = (destination: ClinicProfileFocusTarget) => {
    actions.navigateToProfileTarget(destination)
  }

  return (
    <ClinicDashboardShell
      accountMenu={
        <AccountMenu
          avatar={data.account.avatar}
          initials={data.account.initials}
          name={data.account.name}
          role={data.account.role}
        />
      }
      activeSection={model.activeSection}
      clinicName={data.clinicName}
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
            notifications={data.notifications}
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
          commands={reviewCommands}
          data={data.reviews}
          focusHeading={model.reviewsFocusRequested}
          onFocusHandled={actions.clearReviewsFocusRequest}
          showManagement={capabilities.canManageReviews}
        />
      </div>
      <div hidden={model.activeSection !== "profile"}>
        <ClinicProfile
          canManageProfile={capabilities.canManageProfile}
          canManageTeam={capabilities.canManageTeam}
          commands={clinicProfileCommands}
          focusTarget={model.profileFocusTarget}
          initialDialog={
            start.dialog === "team-member" || start.dialog === "treatment" ? start.dialog : undefined
          }
          initialProfile={data.clinicProfile}
          onFocusHandled={actions.clearProfileFocusRequest}
          showProfileManagement={capabilities.showProfileManagement}
          showTeamManagement={capabilities.showTeamManagement}
        />
      </div>

      <PatientInquiryProfileDialog
        canViewDetailedInquiry={capabilities.canViewDetailedPatientInquiry}
        onOpenChange={actions.setPatientInquiryOpen}
        open={model.patientInquiryOpen}
        patient={data.patientInquiry}
      />
      <ProfileTaskDialog
        onOpenChange={actions.setProfileTaskOpen}
        onProfileDestinationOpen={openProfileDestination}
        open={model.profileTaskOpen}
        task={model.selectedProfileTask}
      />
      {capabilities.showSupport && model.supportOpen ? (
        <SupportRequestDialog commands={supportCommands} onOpenChange={actions.setSupportOpen} open />
      ) : null}
    </ClinicDashboardShell>
  )
}
