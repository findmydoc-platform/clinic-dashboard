import { antalyaLaraDashboard } from "./locations/antalya-lara/dashboard"
import { antalyaLaraMessages, antalyaLaraPatientInquiry } from "./locations/antalya-lara/messages"
import { antalyaLaraProfile } from "./locations/antalya-lara/profile"
import { antalyaLaraReviews } from "./locations/antalya-lara/reviews"
import { istanbulLeventDashboard } from "./locations/istanbul-levent/dashboard"
import { istanbulLeventMessages, istanbulLeventPatientInquiry } from "./locations/istanbul-levent/messages"
import { istanbulLeventProfile } from "./locations/istanbul-levent/profile"
import { istanbulLeventReviews } from "./locations/istanbul-levent/reviews"
import { izmirAlsancakDashboard } from "./locations/izmir-alsancak/dashboard"
import { izmirAlsancakMessages, izmirAlsancakPatientInquiry } from "./locations/izmir-alsancak/messages"
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
    locations: clinicDashboardDemoLocations,
    locationSnapshots: {
      "antalya-lara": {
        clinicProfile: antalyaLaraProfile,
        dashboard: antalyaLaraDashboard,
        messages: antalyaLaraMessages,
        patientInquiry: antalyaLaraPatientInquiry,
        reviews: antalyaLaraReviews,
      },
      "istanbul-levent": {
        clinicProfile: istanbulLeventProfile,
        dashboard: istanbulLeventDashboard,
        messages: istanbulLeventMessages,
        patientInquiry: istanbulLeventPatientInquiry,
        reviews: istanbulLeventReviews,
      },
      "izmir-alsancak": {
        clinicProfile: izmirAlsancakProfile,
        dashboard: izmirAlsancakDashboard,
        messages: izmirAlsancakMessages,
        patientInquiry: izmirAlsancakPatientInquiry,
        reviews: izmirAlsancakReviews,
      },
    },
    notifications: clinicDashboardDemoNotifications,
    organization: clinicDashboardDemoOrganization,
    treatmentCatalogue: clinicDashboardDemoTreatmentCatalogue,
  }

  assertClinicDashboardNotificationTargets(
    input.notifications,
    Object.fromEntries(
      Object.entries(input.locationSnapshots).map(([locationId, snapshot]) => [
        locationId,
        {
          conversationIds: snapshot.messages.conversations.map(({ id }) => id),
          reviewIds: snapshot.reviews.items.map(({ id }) => id),
        },
      ]),
    ),
  )

  return input
}
