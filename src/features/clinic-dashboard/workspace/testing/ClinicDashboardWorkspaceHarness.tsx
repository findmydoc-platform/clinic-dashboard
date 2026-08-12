"use client"

import { useState } from "react"
import {
  clinicProfileFixture,
  clinicProfileSourceFixture,
  clinicTreatmentCatalogueFixture,
  createClinicProfileCommandsFixture,
  createClinicProfileSourceCommandsFixture,
  createDoctorProfileCommandsFixture,
  doctorDirectoryFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/public"
import {
  createDashboardReportingSnapshot,
  type DashboardChartPoint,
  type DashboardReportingSnapshot,
  type DashboardReportingSnapshots,
  type DashboardReportingPeriod,
  type DashboardSelectableMetricId,
  type DashboardSnapshot,
} from "@/features/clinic-dashboard/dashboard/public"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/public"
import {
  getPatientInquiryStatusTransitions,
  type MessagesSnapshot,
  type PatientInquiryProfile,
} from "@/features/clinic-dashboard/messages/public"
import { messagesFixture, patientInquiryFixture } from "@/features/clinic-dashboard/messages/testing/public"
import type { ReviewsSnapshot } from "@/features/clinic-dashboard/reviews/public"
import {
  createReviewSourceCommandsFixture,
  reviewSourceSnapshotFixture,
  reviewsFixture,
} from "@/features/clinic-dashboard/reviews/testing/public"
import type { ClinicDashboardWorkspaceProps } from "../ClinicDashboardWorkspace"
import {
  ClinicDashboardWorkspaceComposition,
  type ClinicDashboardWorkspaceStartState,
} from "../ClinicDashboardWorkspaceComposition"
import type { ClinicDashboardWorkspaceInput } from "../model/workspace-input"
import {
  notificationsFixture,
  authenticatedClinicContextFixture,
  workspaceAccountFixture,
  workspaceLocationFixtures,
  workspaceOrganizationFixture,
} from "./workspace.fixtures"

type ClinicDashboardWorkspaceHarnessProps = Readonly<
  Omit<ClinicDashboardWorkspaceProps, "authenticatedContext" | "workspaceInput"> & {
    notificationState?: Readonly<{
      isOpen?: boolean
      readIds?: readonly string[]
    }>
    reportingPeriod?: DashboardReportingPeriod
    start?: ClinicDashboardWorkspaceStartState
  }
>

type FixtureReportingTotals = Readonly<{
  contacts: number
  impressions: number
  inquiries: number
  profileViews: number
  uniqueVisitors: number
}>

type FixtureReportingTotalsByPeriod = Readonly<Record<DashboardReportingPeriod, FixtureReportingTotals>>

function distributeFixtureTotal(total: number, source: readonly DashboardChartPoint[]) {
  if (source.length === 0) throw new Error("Fixture chart series must contain at least one point.")

  const sourceTotal = source.reduce((sum, point) => sum + point.value, 0)
  if (sourceTotal === 0) {
    return source.map((_, index) => (index === source.length - 1 ? total : 0))
  }

  const exactValues = source.map((point) => (total * point.value) / sourceTotal)
  const values = exactValues.map(Math.floor)
  const remainder = total - values.reduce((sum, value) => sum + value, 0)
  const remainderOrder = exactValues
    .map((value, index) => ({ fraction: value - Math.floor(value), index }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index)

  for (let index = 0; index < remainder; index += 1) {
    const target = remainderOrder[index]
    if (target) values[target.index] = (values[target.index] ?? 0) + 1
  }

  return values
}

function createFixtureDates(points: readonly DashboardChartPoint[]) {
  return points.map((point) =>
    point.axisLabel
      ? { axisLabel: point.axisLabel, dateLabel: point.dateLabel }
      : { dateLabel: point.dateLabel },
  )
}

function getFixtureChange(
  snapshot: DashboardReportingSnapshot,
  metricId: Exclude<DashboardSelectableMetricId, "uniqueVisitors">,
) {
  return snapshot.metrics.find((metric) => metric.id === metricId)?.delta ?? "0.0%"
}

function createDashboardLocationFixture(
  profileCompletion: number,
  rating: number,
  reviewTotal: number,
  totalsByPeriod: FixtureReportingTotalsByPeriod,
): DashboardSnapshot {
  const createReportingFixture = (periodSnapshot: DashboardReportingSnapshot): DashboardReportingSnapshot => {
    const totals = totalsByPeriod[periodSnapshot.period]

    return createDashboardReportingSnapshot({
      changes: {
        contacts: getFixtureChange(periodSnapshot, "contacts"),
        impressions: getFixtureChange(periodSnapshot, "impressions"),
        inquiries: getFixtureChange(periodSnapshot, "inquiries"),
        views: getFixtureChange(periodSnapshot, "views"),
      },
      chart: {
        cadence: periodSnapshot.chart.cadence,
        dates: createFixtureDates(periodSnapshot.chart.series.impressions),
        series: {
          contacts: distributeFixtureTotal(totals.contacts, periodSnapshot.chart.series.contacts),
          impressions: distributeFixtureTotal(totals.impressions, periodSnapshot.chart.series.impressions),
          inquiries: distributeFixtureTotal(totals.inquiries, periodSnapshot.chart.series.inquiries),
          uniqueVisitors: distributeFixtureTotal(
            totals.uniqueVisitors,
            periodSnapshot.chart.series.uniqueVisitors,
          ),
          views: distributeFixtureTotal(totals.profileViews, periodSnapshot.chart.series.views),
        },
      },
      period: periodSnapshot.period,
      profileCompletion,
      reviewActivity: periodSnapshot.reviewActivity,
      totals,
    })
  }
  const reporting = {
    "7 days": createReportingFixture(dashboardFixture.reporting["7 days"]),
    "30 days": createReportingFixture(dashboardFixture.reporting["30 days"]),
    "90 days": createReportingFixture(dashboardFixture.reporting["90 days"]),
  } satisfies DashboardReportingSnapshots

  return {
    ...dashboardFixture,
    profileCompletion,
    rating: {
      ...dashboardFixture.rating,
      count: reviewTotal,
      value: rating,
    },
    reporting,
  }
}

function createMessagesLocationFixture(
  idPrefix: string,
  patientName: string,
  treatmentName: string,
): MessagesSnapshot {
  const activeConversationId = `${idPrefix}-active-conversation`

  return {
    ...messagesFixture,
    activeConversationId,
    conversations: messagesFixture.conversations.map((conversation, index) => ({
      ...conversation,
      id: index === 0 ? activeConversationId : `${idPrefix}-conversation-${index + 1}`,
      name: index === 0 ? patientName : conversation.name,
      treatment: index === 0 ? { name: treatmentName } : conversation.treatment,
    })),
    messages: messagesFixture.messages.map((message, index) => ({
      ...message,
      id: `${idPrefix}-message-${index + 1}`,
    })),
  }
}

function createPatientInquiryLocationFixture(
  id: string,
  name: string,
  email: string,
  interest: string,
): PatientInquiryProfile {
  return { ...patientInquiryFixture, email, id, interest, name }
}

function createReviewDistribution(
  countsByStars: readonly [number, number, number, number, number],
  rating: number,
  total: number,
) {
  const stars = [5, 4, 3, 2, 1] as const
  const receivedTotal = countsByStars.reduce((sum, count) => sum + count, 0)
  if (receivedTotal !== total) {
    throw new Error(`Review fixture distribution must total ${total}, received ${receivedTotal}.`)
  }

  const weightedRating =
    countsByStars.reduce((sum, count, index) => sum + count * (stars[index] ?? 0), 0) / total
  if (Number(weightedRating.toFixed(1)) !== rating) {
    throw new Error(`Review fixture distribution must round to ${rating}, received ${weightedRating}.`)
  }

  const percentages = countsByStars.map((count) => Number(((count / total) * 100).toFixed(1)))
  percentages[0] = Number(
    ((percentages[0] ?? 0) + 100 - percentages.reduce((sum, percent) => sum + percent, 0)).toFixed(1),
  )

  return countsByStars.map((count, index) => ({
    count,
    percent: percentages[index] ?? 0,
    stars: stars[index] ?? 1,
  }))
}

function createReviewsLocationFixture(
  idPrefix: string,
  author: string,
  rating: number,
  total: number,
  distribution: readonly [number, number, number, number, number],
) {
  return {
    ...reviewsFixture,
    distribution: createReviewDistribution(distribution, rating, total),
    items: reviewsFixture.items.map((review, index) => ({
      ...review,
      author: index === 0 ? author : review.author,
      id: `${idPrefix}-${review.id}`,
    })),
    rating,
    total,
  } satisfies ReviewsSnapshot
}

const mitteProfile = {
  ...clinicProfileFixture,
  galleryTotal: 4,
  id: "fixture-clinic-berlin-mitte",
  name: "Berlin Health Clinic — Mitte",
}

const charlottenburgProfile = {
  ...clinicProfileFixture,
  address: { ...clinicProfileFixture.address, street: "Fixture Avenue 212" },
  gallery: clinicProfileFixture.gallery.map((item) => ({
    ...item,
    id: `charlottenburg-${item.id}`,
  })),
  galleryTotal: 4,
  id: "fixture-clinic-berlin-charlottenburg",
  name: "Berlin Health Clinic — Charlottenburg",
}

const potsdamProfile = {
  ...clinicProfileFixture,
  address: {
    ...clinicProfileFixture.address,
    city: "Potsdam",
    postalCode: "14467",
    street: "Fixture Street 45",
  },
  gallery: clinicProfileFixture.gallery.map((item) => ({ ...item, id: `potsdam-${item.id}` })),
  galleryTotal: 4,
  id: "fixture-clinic-potsdam",
  name: "Berlin Health Clinic — Potsdam",
}

export const clinicDashboardWorkspaceFixture = {
  account: workspaceAccountFixture,
  defaultLocationId: "berlin-mitte",
  doctorDirectory: doctorDirectoryFixture,
  inquiryQueue: {
    inquiries: [
      {
        ...patientInquiryFixture,
        availableTransitions: getPatientInquiryStatusTransitions("submitted"),
        createdAt: "2026-07-26T08:54:00.000Z",
        dateLabel: "26 July 2026",
        status: "submitted",
        timeLabel: "10:54",
      },
    ],
    status: "ready",
  },
  profileSourceSnapshot: clinicProfileSourceFixture,
  reviewSourceSnapshot: reviewSourceSnapshotFixture,
  locations: workspaceLocationFixtures,
  locationSnapshots: {
    "berlin-charlottenburg": {
      clinicProfile: charlottenburgProfile,
      dashboard: createDashboardLocationFixture(91, 4.6, 486, {
        "7 days": {
          contacts: 18,
          impressions: 3_140,
          inquiries: 7,
          profileViews: 672,
          uniqueVisitors: 438,
        },
        "30 days": {
          contacts: 61,
          impressions: 12_760,
          inquiries: 24,
          profileViews: 2_740,
          uniqueVisitors: 1_780,
        },
        "90 days": {
          contacts: 158,
          impressions: 35_920,
          inquiries: 62,
          profileViews: 7_420,
          uniqueVisitors: 4_860,
        },
      }),
      messages: createMessagesLocationFixture("charlottenburg", "Lina Fixture", "Ceramic veneers"),
      patientInquiry: createPatientInquiryLocationFixture(
        "charlottenburg-inquiry",
        "Lina Fixture",
        "lina.fixture@example.com",
        "Ceramic veneers",
      ),
      reviews: createReviewsLocationFixture("charlottenburg", "Eva Fixture", 4.6, 486, [330, 130, 20, 5, 1]),
    },
    "berlin-mitte": {
      clinicProfile: mitteProfile,
      dashboard: createDashboardLocationFixture(82, 4.8, 1_248, {
        "7 days": {
          contacts: 12,
          impressions: 4_680,
          inquiries: 5,
          profileViews: 848,
          uniqueVisitors: 543,
        },
        "30 days": {
          contacts: 42,
          impressions: 18_420,
          inquiries: 16,
          profileViews: 3_284,
          uniqueVisitors: 2_105,
        },
        "90 days": {
          contacts: 118,
          impressions: 53_680,
          inquiries: 45,
          profileViews: 9_410,
          uniqueVisitors: 6_006,
        },
      }),
      messages: createMessagesLocationFixture("mitte", "Lukas Fixture", "Hair transplant"),
      patientInquiry: createPatientInquiryLocationFixture(
        "mitte-inquiry",
        "Lukas Fixture",
        "lukas.fixture@example.com",
        "Hair transplant",
      ),
      reviews: createReviewsLocationFixture("mitte", "Markus Fixture", 4.8, 1_248, [1_050, 150, 35, 10, 3]),
    },
    potsdam: {
      clinicProfile: potsdamProfile,
      dashboard: createDashboardLocationFixture(64, 4.9, 92, {
        "7 days": {
          contacts: 10,
          impressions: 1_260,
          inquiries: 4,
          profileViews: 286,
          uniqueVisitors: 201,
        },
        "30 days": {
          contacts: 38,
          impressions: 4_960,
          inquiries: 15,
          profileViews: 1_080,
          uniqueVisitors: 758,
        },
        "90 days": {
          contacts: 91,
          impressions: 12_840,
          inquiries: 36,
          profileViews: 2_760,
          uniqueVisitors: 1_940,
        },
      }),
      messages: createMessagesLocationFixture("potsdam", "Mila Fixture", "Skin analysis"),
      patientInquiry: createPatientInquiryLocationFixture(
        "potsdam-inquiry",
        "Mila Fixture",
        "mila.fixture@example.com",
        "Skin analysis",
      ),
      reviews: createReviewsLocationFixture("potsdam", "Greta Fixture", 4.9, 92, [81, 9, 2, 0, 0]),
    },
  },
  notifications: notificationsFixture,
  organization: workspaceOrganizationFixture,
  treatmentCatalogue: clinicTreatmentCatalogueFixture,
} satisfies ClinicDashboardWorkspaceInput

export function ClinicDashboardWorkspaceHarness({
  notificationState,
  persistNotificationReadStateInSession = false,
  prototypeMode,
  reportingPeriod = "30 days",
  showPrototypeModeToggle = false,
  start,
}: ClinicDashboardWorkspaceHarnessProps) {
  const [clinicProfileCommands] = useState(() => createClinicProfileCommandsFixture())
  const [clinicProfileSourceCommands] = useState(() => createClinicProfileSourceCommandsFixture())
  const [doctorProfileCommands] = useState(() => createDoctorProfileCommandsFixture())
  const [reviewCommands] = useState(() => createReviewSourceCommandsFixture())
  return (
    <ClinicDashboardWorkspaceComposition
      authenticatedContext={authenticatedClinicContextFixture}
      clinicProfileCommands={clinicProfileCommands}
      clinicProfileSourceCommands={clinicProfileSourceCommands}
      doctorProfileCommands={doctorProfileCommands}
      initialNotificationReadIds={notificationState?.readIds}
      initialNotificationsOpen={notificationState?.isOpen}
      initialReportingPeriod={reportingPeriod}
      persistNotificationReadStateInSession={persistNotificationReadStateInSession}
      prototypeMode={prototypeMode}
      projectDashboardAfterProfileSave={({ initialProfile, savedProfile, snapshot }) => {
        const coverChanged =
          initialProfile.gallery.find(({ isCover }) => isCover)?.id !==
          savedProfile.gallery.find(({ isCover }) => isCover)?.id
        return {
          ...snapshot,
          profileCompletion: Math.min(snapshot.profileCompletion + (coverChanged ? 4 : 0), 100),
          profileTasks: snapshot.profileTasks.filter(
            ({ destination }) => !(destination === "gallery" && coverChanged),
          ),
        }
      }}
      reviewCommands={reviewCommands}
      showPrototypeModeToggle={showPrototypeModeToggle}
      start={start}
      workspaceInput={clinicDashboardWorkspaceFixture}
    />
  )
}
