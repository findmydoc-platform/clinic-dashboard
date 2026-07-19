"use client"

import {
  clinicProfilePrototypeData,
  clinicTreatmentCataloguePrototypeData,
} from "@/features/clinic-dashboard/clinic-profile/clinic-profile.prototype-data"
import { dashboardPrototypeData } from "@/features/clinic-dashboard/dashboard/dashboard.prototype-data"
import {
  messagesPrototypeData,
  patientInquiryPrototypeData,
} from "@/features/clinic-dashboard/messages/messages.prototype-data"
import {
  clinicProfilePrototypeCommands,
  reviewPrototypeCommands,
} from "@/features/clinic-dashboard/prototype/prototype-commands"
import type { ClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/public"
import { reviewsPrototypeData } from "@/features/clinic-dashboard/reviews/reviews.prototype-data"
import {
  ClinicDashboardWorkspaceComposition,
  type ClinicDashboardWorkspaceSnapshot,
} from "./ClinicDashboardWorkspaceComposition"
import { clinicDashboardWorkspacePrototypeData } from "./workspace.prototype-data"

export type ClinicDashboardWorkspaceProps = Readonly<{
  persistWorkspaceStateInSession?: boolean
  prototypeMode: ClinicDashboardPrototypeMode
  showPrototypeModeToggle?: boolean
}>

const clinicDashboardWorkspaceSnapshot = {
  account: clinicDashboardWorkspacePrototypeData.account,
  clinicProfile: clinicProfilePrototypeData,
  dashboard: dashboardPrototypeData,
  locations: clinicDashboardWorkspacePrototypeData.locations,
  messages: messagesPrototypeData,
  notifications: clinicDashboardWorkspacePrototypeData.notifications,
  organizationName: clinicDashboardWorkspacePrototypeData.organizationName,
  patientInquiry: patientInquiryPrototypeData,
  reviews: reviewsPrototypeData,
  treatmentCatalogue: clinicTreatmentCataloguePrototypeData,
} satisfies ClinicDashboardWorkspaceSnapshot

export function ClinicDashboardWorkspace({
  persistWorkspaceStateInSession = false,
  prototypeMode,
  showPrototypeModeToggle = false,
}: ClinicDashboardWorkspaceProps) {
  return (
    <ClinicDashboardWorkspaceComposition
      clinicProfileCommands={clinicProfilePrototypeCommands}
      persistWorkspaceStateInSession={persistWorkspaceStateInSession}
      prototypeMode={prototypeMode}
      reviewCommands={reviewPrototypeCommands}
      showPrototypeModeToggle={showPrototypeModeToggle}
      snapshot={clinicDashboardWorkspaceSnapshot}
    />
  )
}
