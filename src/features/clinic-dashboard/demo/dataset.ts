import { antalyaLaraDashboard } from "./locations/antalya-lara/dashboard"
import { antalyaLaraProfile } from "./locations/antalya-lara/profile"
import { antalyaLaraReviews } from "./locations/antalya-lara/reviews"
import { istanbulLeventDashboard } from "./locations/istanbul-levent/dashboard"
import { istanbulLeventProfile } from "./locations/istanbul-levent/profile"
import { istanbulLeventReviews } from "./locations/istanbul-levent/reviews"
import { izmirAlsancakDashboard } from "./locations/izmir-alsancak/dashboard"
import { izmirAlsancakProfile } from "./locations/izmir-alsancak/profile"
import { izmirAlsancakReviews } from "./locations/izmir-alsancak/reviews"
import { clinicDashboardDemoNotifications } from "./notifications"
import {
  clinicDashboardDemoAccount,
  clinicDashboardDemoDefaultLocationId,
  clinicDashboardDemoLocations,
  clinicDashboardDemoOrganization,
  clinicDashboardDemoTreatmentCatalogue,
} from "./organization"
import type { ClinicDashboardWorkspaceInput } from "../workspace/model/workspace-input"
import { assertClinicDashboardNotificationTargets } from "../workspace/model/notifications"

export function buildClinicDashboardDemoWorkspaceInput(): ClinicDashboardWorkspaceInput {
  const input: ClinicDashboardWorkspaceInput = {
    account: clinicDashboardDemoAccount,
    defaultLocationId: clinicDashboardDemoDefaultLocationId,
    doctorDirectory: {
      doctors: [],
      medicalSpecialties: [],
      status: "temporarily-unavailable",
    },
    galleryStatus: "temporarily-unavailable",
    inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
    locations: clinicDashboardDemoLocations,
    locationSnapshots: {
      "antalya-lara": {
        clinicProfile: antalyaLaraProfile,
        dashboard: antalyaLaraDashboard,
        reviews: antalyaLaraReviews,
      },
      "istanbul-levent": {
        clinicProfile: istanbulLeventProfile,
        dashboard: istanbulLeventDashboard,
        reviews: istanbulLeventReviews,
      },
      "izmir-alsancak": {
        clinicProfile: izmirAlsancakProfile,
        dashboard: izmirAlsancakDashboard,
        reviews: izmirAlsancakReviews,
      },
    },
    notifications: clinicDashboardDemoNotifications,
    organization: clinicDashboardDemoOrganization,
    profileProgress: {
      message: "Public profile progress is temporarily unavailable.",
      reason: "profile-unavailable",
      status: "error",
    },
    treatmentSnapshot: {
      catalogue: clinicDashboardDemoTreatmentCatalogue,
      offerings: [
        {
          active: true,
          id: "demo-offering-hair-transplant",
          price: 3900,
          revision: "2026-08-01T08:00:00.000Z",
          treatment: clinicDashboardDemoTreatmentCatalogue[3],
        },
        {
          active: false,
          id: "demo-offering-dermatology-consultation",
          price: 150,
          revision: "2026-08-01T08:00:00.000Z",
          treatment: clinicDashboardDemoTreatmentCatalogue[4],
        },
        {
          active: true,
          id: "demo-offering-skin-analysis",
          price: 0,
          revision: "2026-08-01T08:00:00.000Z",
          treatment: clinicDashboardDemoTreatmentCatalogue[2],
        },
      ],
      status: "ready",
    },
  }

  assertClinicDashboardNotificationTargets(
    input.notifications,
    Object.fromEntries(
      Object.entries(input.locationSnapshots).map(([locationId, snapshot]) => [
        locationId,
        {
          reviewIds: snapshot.reviews.items.map(({ id }) => id),
        },
      ]),
    ),
  )

  return input
}
