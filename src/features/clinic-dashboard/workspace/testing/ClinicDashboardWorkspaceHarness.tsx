"use client"

import { useState } from "react"
import {
  clinicProfileFixture,
  createClinicProfileCommandsFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/public"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/public"
import { messagesFixture, patientInquiryFixture } from "@/features/clinic-dashboard/messages/testing/public"
import {
  createReviewCommandsFixture,
  reviewsFixture,
} from "@/features/clinic-dashboard/reviews/testing/public"
import type { DashboardReportingPeriod } from "@/features/clinic-dashboard/dashboard/public"
import type { ClinicDashboardWorkspaceProps } from "../ClinicDashboardWorkspace"
import {
  ClinicDashboardWorkspaceComposition,
  type ClinicDashboardWorkspaceSnapshot,
  type ClinicDashboardWorkspaceStartState,
} from "../ClinicDashboardWorkspaceComposition"
import { notificationsFixture, workspaceAccountFixture } from "./workspace.fixtures"

type ClinicDashboardWorkspaceHarnessProps = Readonly<
  ClinicDashboardWorkspaceProps & {
    notificationState?: Readonly<{
      isOpen?: boolean
      readIds?: readonly string[]
    }>
    reportingPeriod?: DashboardReportingPeriod
    start?: ClinicDashboardWorkspaceStartState
  }
>

const clinicDashboardWorkspaceFixture = {
  account: workspaceAccountFixture,
  clinicName: "Berlin Health Clinic",
  clinicProfile: clinicProfileFixture,
  dashboard: dashboardFixture,
  messages: messagesFixture,
  notifications: notificationsFixture,
  patientInquiry: patientInquiryFixture,
  reviews: reviewsFixture,
} satisfies ClinicDashboardWorkspaceSnapshot

export function ClinicDashboardWorkspaceHarness({
  notificationState,
  persistWorkspaceStateInSession = false,
  prototypeMode,
  reportingPeriod = "30 days",
  showPrototypeModeToggle = false,
  start,
}: ClinicDashboardWorkspaceHarnessProps) {
  const [clinicProfileCommands] = useState(() => createClinicProfileCommandsFixture())
  const [reviewCommands] = useState(() => createReviewCommandsFixture())

  return (
    <ClinicDashboardWorkspaceComposition
      clinicProfileCommands={clinicProfileCommands}
      initialNotificationReadIds={notificationState?.readIds}
      initialNotificationsOpen={notificationState?.isOpen}
      initialReportingPeriod={reportingPeriod}
      persistWorkspaceStateInSession={persistWorkspaceStateInSession}
      prototypeMode={prototypeMode}
      reviewCommands={reviewCommands}
      showPrototypeModeToggle={showPrototypeModeToggle}
      start={start}
      snapshot={clinicDashboardWorkspaceFixture}
    />
  )
}
