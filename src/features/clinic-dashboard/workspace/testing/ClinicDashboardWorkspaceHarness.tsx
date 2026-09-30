"use client"

import { useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import {
  evaluateClinicProfileCompleteness,
  evaluateClinicProfileDraftCompleteness,
  type ClinicProfileSnapshot,
} from "@/features/clinic-dashboard/clinic-profile/public"
import {
  clinicProfileFixture,
  clinicGallerySnapshotFixture,
  clinicProfileSourceFixture,
  clinicTreatmentSnapshotFixture,
  createClinicGalleryCommandsFixture,
  createClinicProfileSourceCommandsFixture,
  createClinicTreatmentCommandsFixture,
  createDoctorProfileCommandsFixture,
  doctorDirectoryFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/public"
import {
  createDashboardProfileProgress,
  type DashboardProfileProgressState,
} from "@/features/clinic-dashboard/dashboard/public"
import { clinicDashboardReportingFixture } from "@/features/clinic-dashboard/dashboard/testing/public"
import { inquiryQueueFixture } from "@/features/clinic-dashboard/messages/testing/public"
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
  Omit<ClinicDashboardWorkspaceProps, "authenticatedContext" | "initialReporting" | "workspaceInput"> & {
    notificationState?: Readonly<{
      isOpen?: boolean
      readIds?: readonly string[]
    }>
    profileProgress?: DashboardProfileProgressState
    profileSourceSnapshot?: ClinicProfileSnapshot
    start?: ClinicDashboardWorkspaceStartState
  }
>

const profileProgressFixture = createDashboardProfileProgress({
  gallery: { snapshot: clinicGallerySnapshotFixture, status: "ready" },
  profile: {
    draft: evaluateClinicProfileDraftCompleteness(clinicProfileSourceFixture),
    published: evaluateClinicProfileCompleteness(clinicProfileSourceFixture),
  },
  taskActionability: {
    canEditGallery: true,
    canEditProfile: true,
    canEditTreatments: true,
  },
  treatments: clinicTreatmentSnapshotFixture,
})
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
  galleryStatus: "ready",
  gallerySnapshot: clinicGallerySnapshotFixture,
  doctorDirectory: doctorDirectoryFixture,
  inquiryQueue: inquiryQueueFixture,
  profileSourceSnapshot: clinicProfileSourceFixture,
  reviewSourceSnapshot: reviewSourceSnapshotFixture,
  locations: workspaceLocationFixtures,
  locationSnapshots: {
    "berlin-charlottenburg": {
      clinicProfile: charlottenburgProfile,
      reviews: createReviewsLocationFixture("charlottenburg", "Eva Fixture", 4.6, 486, [330, 130, 20, 5, 1]),
    },
    "berlin-mitte": {
      clinicProfile: mitteProfile,
      reviews: createReviewsLocationFixture("mitte", "Markus Fixture", 4.8, 1_248, [1_050, 150, 35, 10, 3]),
    },
    potsdam: {
      clinicProfile: potsdamProfile,
      reviews: createReviewsLocationFixture("potsdam", "Greta Fixture", 4.9, 92, [81, 9, 2, 0, 0]),
    },
  },
  notifications: notificationsFixture,
  organization: workspaceOrganizationFixture,
  profileProgress: profileProgressFixture,
  treatmentSnapshot: clinicTreatmentSnapshotFixture,
} satisfies ClinicDashboardWorkspaceInput

export function ClinicDashboardWorkspaceHarness({
  focusInquiryId,
  notificationState,
  persistNotificationReadStateInSession = false,
  profileProgress,
  profileSourceSnapshot,
  prototypeMode,
  showPrototypeModeToggle = false,
  start,
}: ClinicDashboardWorkspaceHarnessProps) {
  const [clinicGalleryCommands] = useState(() => createClinicGalleryCommandsFixture())
  const [clinicProfileSourceCommands] = useState(() =>
    createClinicProfileSourceCommandsFixture(profileSourceSnapshot ?? clinicProfileSourceFixture),
  )
  const [clinicTreatmentCommands] = useState(() => createClinicTreatmentCommandsFixture())
  const [doctorProfileCommands] = useState(() => createDoctorProfileCommandsFixture())
  const [reviewCommands] = useState(() => createReviewSourceCommandsFixture())
  return (
    <>
      <ClinicDashboardWorkspaceComposition
        authenticatedContext={authenticatedClinicContextFixture}
        clinicGalleryCommands={clinicGalleryCommands}
        clinicProfileSourceCommands={clinicProfileSourceCommands}
        clinicTreatmentCommands={clinicTreatmentCommands}
        doctorProfileCommands={doctorProfileCommands}
        focusInquiryId={focusInquiryId}
        initialNotificationReadIds={notificationState?.readIds}
        initialNotificationsOpen={notificationState?.isOpen}
        initialReporting={{ reporting: clinicDashboardReportingFixture, status: "ready" }}
        isSourceRefreshPending={false}
        onSourceRefresh={() => undefined}
        persistNotificationReadStateInSession={persistNotificationReadStateInSession}
        prototypeMode={prototypeMode}
        reviewCommands={reviewCommands}
        showPrototypeModeToggle={showPrototypeModeToggle}
        start={start}
        workspaceInput={{
          ...clinicDashboardWorkspaceFixture,
          profileProgress: profileProgress ?? clinicDashboardWorkspaceFixture.profileProgress,
          profileSourceSnapshot:
            profileSourceSnapshot ?? clinicDashboardWorkspaceFixture.profileSourceSnapshot,
        }}
      />
      <Toaster position="top-right" richColors />
    </>
  )
}
