import { berlinCharlottenburgDashboard } from "./locations/berlin-charlottenburg/dashboard"
import {
  berlinCharlottenburgMessages,
  berlinCharlottenburgPatientInquiry,
} from "./locations/berlin-charlottenburg/messages"
import { berlinCharlottenburgProfile } from "./locations/berlin-charlottenburg/profile"
import { berlinCharlottenburgReviews } from "./locations/berlin-charlottenburg/reviews"
import { berlinMitteDashboard } from "./locations/berlin-mitte/dashboard"
import { berlinMitteMessages, berlinMittePatientInquiry } from "./locations/berlin-mitte/messages"
import { berlinMitteProfile } from "./locations/berlin-mitte/profile"
import { berlinMitteReviews } from "./locations/berlin-mitte/reviews"
import { potsdamDashboard } from "./locations/potsdam/dashboard"
import { potsdamMessages, potsdamPatientInquiry } from "./locations/potsdam/messages"
import { potsdamProfile } from "./locations/potsdam/profile"
import { potsdamReviews } from "./locations/potsdam/reviews"
import { clinicDashboardDemoNotifications } from "./notifications"
import {
  clinicDashboardDemoAccount,
  clinicDashboardDemoDefaultLocationId,
  clinicDashboardDemoLocations,
  clinicDashboardDemoOrganization,
  clinicDashboardDemoTreatmentCatalogue,
} from "./organization"
import type { ClinicDashboardWorkspaceInput } from "../workspace/model/workspace-input"

export function buildClinicDashboardDemoWorkspaceInput(): ClinicDashboardWorkspaceInput {
  return {
    account: clinicDashboardDemoAccount,
    dataSource: "demo",
    defaultLocationId: clinicDashboardDemoDefaultLocationId,
    locations: clinicDashboardDemoLocations,
    locationSnapshots: {
      "berlin-charlottenburg": {
        clinicProfile: berlinCharlottenburgProfile,
        dashboard: berlinCharlottenburgDashboard,
        messages: berlinCharlottenburgMessages,
        patientInquiry: berlinCharlottenburgPatientInquiry,
        reviews: berlinCharlottenburgReviews,
      },
      "berlin-mitte": {
        clinicProfile: berlinMitteProfile,
        dashboard: berlinMitteDashboard,
        messages: berlinMitteMessages,
        patientInquiry: berlinMittePatientInquiry,
        reviews: berlinMitteReviews,
      },
      potsdam: {
        clinicProfile: potsdamProfile,
        dashboard: potsdamDashboard,
        messages: potsdamMessages,
        patientInquiry: potsdamPatientInquiry,
        reviews: potsdamReviews,
      },
    },
    notifications: clinicDashboardDemoNotifications,
    organization: clinicDashboardDemoOrganization,
    treatmentCatalogue: clinicDashboardDemoTreatmentCatalogue,
  }
}
