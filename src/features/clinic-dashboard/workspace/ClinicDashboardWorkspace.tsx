"use client"

import { clinicProfilePrototypeData } from "@/features/clinic-dashboard/clinic-profile/clinic-profile.prototype-data"
import { dashboardPrototypeData } from "@/features/clinic-dashboard/dashboard/dashboard.prototype-data"
import {
  messagesPrototypeData,
  patientInquiryPrototypeData,
} from "@/features/clinic-dashboard/messages/messages.prototype-data"
import {
  clinicProfilePrototypeCommands,
  reviewPrototypeCommands,
  supportPrototypeCommands,
} from "@/features/clinic-dashboard/prototype/prototype-commands"
import type { ClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/public"
import { reviewsPrototypeData } from "@/features/clinic-dashboard/reviews/reviews.prototype-data"
import {
  ClinicDashboardWorkspaceComposition,
  type ClinicDashboardWorkspaceCompositionData,
} from "./ClinicDashboardWorkspaceComposition"
import { clinicDashboardWorkspacePrototypeData } from "./workspace.prototype-data"

export type ClinicDashboardWorkspaceProps = Readonly<{
  persistWorkspaceStateInSession?: boolean
  prototypeMode: ClinicDashboardPrototypeMode
  showPrototypeModeToggle?: boolean
}>

const clinicDashboardWorkspaceData = {
  account: clinicDashboardWorkspacePrototypeData.account,
  clinicName: clinicDashboardWorkspacePrototypeData.clinicName,
  clinicProfile: clinicProfilePrototypeData,
  dashboard: dashboardPrototypeData,
  messages: messagesPrototypeData,
  notifications: clinicDashboardWorkspacePrototypeData.notifications,
  patientInquiry: patientInquiryPrototypeData,
  reviews: reviewsPrototypeData,
} satisfies ClinicDashboardWorkspaceCompositionData

export function ClinicDashboardWorkspace({
  persistWorkspaceStateInSession = false,
  prototypeMode,
  showPrototypeModeToggle = false,
}: ClinicDashboardWorkspaceProps) {
  return (
    <ClinicDashboardWorkspaceComposition
      clinicProfileCommands={clinicProfilePrototypeCommands}
      data={clinicDashboardWorkspaceData}
      persistWorkspaceStateInSession={persistWorkspaceStateInSession}
      prototypeMode={prototypeMode}
      reviewCommands={reviewPrototypeCommands}
      showPrototypeModeToggle={showPrototypeModeToggle}
      supportCommands={supportPrototypeCommands}
    />
  )
}
