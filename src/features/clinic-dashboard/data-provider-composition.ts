import "server-only"

import { isControlledAuthTestMode, validateEnvironment } from "@/lib/env"
import { createControlledPatientInquiryProvider } from "./messages/server/controlled-inquiries"
import type { PatientInquiryProvider } from "./messages/server/patient-inquiry-provider"
import { createPayloadPatientInquiryProvider } from "./messages/server/payload-inquiries"

export type ClinicDashboardDataProviders = Readonly<{
  inquiries: PatientInquiryProvider
}>

export function composeClinicDashboardDataProviders(
  accessToken: string,
  environment: Record<string, string | undefined> = process.env,
): ClinicDashboardDataProviders {
  if (!accessToken.trim()) {
    throw new Error("A verified clinic access token is required")
  }

  const validatedEnvironment = validateEnvironment(environment)
  return {
    inquiries: isControlledAuthTestMode(validatedEnvironment)
      ? createControlledPatientInquiryProvider()
      : createPayloadPatientInquiryProvider(accessToken),
  }
}
