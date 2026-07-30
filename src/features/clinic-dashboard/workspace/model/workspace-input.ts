import type {
  ClinicProfileDraft,
  ClinicTreatmentsSnapshot,
  DoctorDirectorySnapshot,
} from "@/features/clinic-dashboard/clinic-profile/public"
import type { DashboardSnapshot } from "@/features/clinic-dashboard/dashboard/public"
import type {
  MessagesSnapshot,
  PatientInquiryProfile,
  PatientInquiryQueueSnapshot,
} from "@/features/clinic-dashboard/messages/public"
import type { ReviewsSnapshot } from "@/features/clinic-dashboard/reviews/public"
import type { ClinicDashboardLocation, ClinicDashboardLocationId } from "./locations"
import type { ClinicDashboardNotification } from "./notifications"

type ClinicDashboardSerializableImage =
  | string
  | Readonly<{
      blurDataURL?: string
      blurHeight?: number
      blurWidth?: number
      height: number
      src: string
      width: number
    }>

export type ClinicDashboardLocationSnapshot = Readonly<{
  clinicProfile: ClinicProfileDraft
  dashboard: DashboardSnapshot
  messages: MessagesSnapshot
  patientInquiry: PatientInquiryProfile
  reviews: ReviewsSnapshot
}>

/**
 * Private provisional input for the interactive clinic workspace.
 *
 * This contract is shared by the current demo provider and a future live
 * provider. It may be replaced when the Payload and capability contracts are
 * planned.
 */
export type ClinicDashboardWorkspaceInput = Readonly<{
  account: Readonly<{
    avatar?: ClinicDashboardSerializableImage
    initials: string
    name: string
    role: string
  }>
  defaultLocationId: ClinicDashboardLocationId
  doctorDirectory: DoctorDirectorySnapshot
  inquiryQueue: PatientInquiryQueueSnapshot
  locations: readonly ClinicDashboardLocation[]
  locationSnapshots: Readonly<Record<ClinicDashboardLocationId, ClinicDashboardLocationSnapshot>>
  notifications: readonly ClinicDashboardNotification[]
  organization: Readonly<{
    id: string
    name: string
  }>
  treatmentSnapshot: ClinicTreatmentsSnapshot
}>

export function getClinicDashboardLocationSnapshot(
  input: ClinicDashboardWorkspaceInput,
  locationId: ClinicDashboardLocationId,
) {
  const snapshot = input.locationSnapshots[locationId]

  if (!snapshot) {
    throw new Error(`Missing clinic dashboard snapshot for location: ${locationId}`)
  }

  return snapshot
}
