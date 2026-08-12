import "server-only"

import { isControlledAuthTestMode, validateEnvironment } from "@/lib/env"
import { createControlledClinicProfileProvider } from "./clinic-profile/server/controlled-clinic-profile"
import type { ClinicProfileProvider } from "./clinic-profile/server/clinic-profile-provider"
import { createControlledDoctorProfileProvider } from "./clinic-profile/server/controlled-doctor-profiles"
import type { DoctorProfileProvider } from "./clinic-profile/server/doctor-profile-provider"
import { createPayloadClinicProfileProvider } from "./clinic-profile/server/payload-clinic-profile"
import { createPayloadDoctorProfileProvider } from "./clinic-profile/server/payload-doctor-profiles"
import { createControlledPatientInquiryProvider } from "./messages/server/controlled-inquiries"
import type { PatientInquiryProvider } from "./messages/server/patient-inquiry-provider"
import { createPayloadPatientInquiryProvider } from "./messages/server/payload-inquiries"
import { createControlledReviewProvider } from "./reviews/server/controlled-reviews"
import { createPayloadReviewProvider } from "./reviews/server/payload-reviews"
import type { ReviewProvider } from "./reviews/server/review-provider"

export type ClinicDashboardDataProviders = Readonly<{
  doctors: DoctorProfileProvider
  inquiries: PatientInquiryProvider
  profile: ClinicProfileProvider
  reviews: ReviewProvider
}>

export function composeClinicDashboardDataProviders(
  accessToken: string,
  clinicId: string,
  environment: Record<string, string | undefined> = process.env,
): ClinicDashboardDataProviders {
  if (!accessToken.trim()) {
    throw new Error("A verified clinic access token is required")
  }
  if (!clinicId.trim()) {
    throw new Error("A verified clinic identity is required")
  }

  const validatedEnvironment = validateEnvironment(environment)
  const controlled = isControlledAuthTestMode(validatedEnvironment)
  return {
    doctors: controlled
      ? createControlledDoctorProfileProvider()
      : createPayloadDoctorProfileProvider(accessToken, clinicId),
    inquiries: controlled
      ? createControlledPatientInquiryProvider()
      : createPayloadPatientInquiryProvider(accessToken),
    profile: controlled
      ? createControlledClinicProfileProvider()
      : createPayloadClinicProfileProvider(accessToken, clinicId),
    reviews: controlled
      ? createControlledReviewProvider()
      : createPayloadReviewProvider(accessToken, clinicId),
  }
}
