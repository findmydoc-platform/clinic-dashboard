import "server-only"

import { isControlledAuthTestMode, validateEnvironment } from "@/lib/env"
import { createControlledDoctorProfileProvider } from "./clinic-profile/server/controlled-doctor-profiles"
import type { DoctorProfileProvider } from "./clinic-profile/server/doctor-profile-provider"
import { createPayloadDoctorProfileProvider } from "./clinic-profile/server/payload-doctor-profiles"
import { createControlledPatientInquiryProvider } from "./messages/server/controlled-inquiries"
import type { PatientInquiryProvider } from "./messages/server/patient-inquiry-provider"
import { createPayloadPatientInquiryProvider } from "./messages/server/payload-inquiries"

export type ClinicDashboardDataProviders = Readonly<{
  doctors: DoctorProfileProvider
  inquiries: PatientInquiryProvider
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
  }
}
