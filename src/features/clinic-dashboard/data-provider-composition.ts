import "server-only"

import { isControlledAuthTestMode, validateEnvironment } from "@/lib/env"
import { createControlledClinicProfileProvider } from "./clinic-profile/server/controlled-clinic-profile"
import { createControlledClinicGalleryProvider } from "./clinic-profile/server/controlled-clinic-gallery"
import type { ClinicGalleryProvider } from "./clinic-profile/server/clinic-gallery-provider"
import type { ClinicProfileProvider } from "./clinic-profile/server/clinic-profile-provider"
import { createControlledClinicTreatmentProvider } from "./clinic-profile/server/controlled-clinic-treatments"
import type { ClinicTreatmentProvider } from "./clinic-profile/server/clinic-treatment-provider"
import { createControlledDoctorProfileProvider } from "./clinic-profile/server/controlled-doctor-profiles"
import type { DoctorProfileProvider } from "./clinic-profile/server/doctor-profile-provider"
import { createPayloadClinicProfileProvider } from "./clinic-profile/server/payload-clinic-profile"
import { createPayloadClinicGalleryProvider } from "./clinic-profile/server/payload-clinic-gallery"
import { createPayloadDoctorProfileProvider } from "./clinic-profile/server/payload-doctor-profiles"
import { createPayloadClinicTreatmentProvider } from "./clinic-profile/server/payload-clinic-treatments"
import {
  createControlledPatientInquiryAttachmentDraftUpload,
  createControlledPatientInquiryProvider,
} from "./messages/server/controlled-inquiries"
import type {
  PatientInquiryAttachmentDraftUpload,
  PatientInquiryProvider,
} from "./messages/server/patient-inquiry-provider"
import { createPayloadPatientInquiryProvider } from "./messages/server/payload-inquiries"
import { createControlledReviewProvider } from "./reviews/server/controlled-reviews"
import { createPayloadReviewProvider } from "./reviews/server/payload-reviews"
import type { ReviewProvider } from "./reviews/server/review-provider"

export type ClinicDashboardDataProviders = Readonly<{
  doctors: DoctorProfileProvider
  gallery: ClinicGalleryProvider
  inquiries: PatientInquiryProvider
  inquiryAttachmentDraftUpload?: PatientInquiryAttachmentDraftUpload
  profile: ClinicProfileProvider
  reviews: ReviewProvider
  treatments: ClinicTreatmentProvider
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
    gallery: controlled
      ? createControlledClinicGalleryProvider(clinicId)
      : createPayloadClinicGalleryProvider(accessToken, clinicId),
    inquiries: controlled
      ? createControlledPatientInquiryProvider(clinicId)
      : createPayloadPatientInquiryProvider(accessToken, clinicId),
    ...(controlled
      ? { inquiryAttachmentDraftUpload: createControlledPatientInquiryAttachmentDraftUpload(clinicId) }
      : {}),
    profile: controlled
      ? createControlledClinicProfileProvider()
      : createPayloadClinicProfileProvider(accessToken, clinicId),
    reviews: controlled
      ? createControlledReviewProvider()
      : createPayloadReviewProvider(accessToken, clinicId),
    treatments: controlled
      ? createControlledClinicTreatmentProvider(clinicId)
      : createPayloadClinicTreatmentProvider(accessToken, clinicId),
  }
}
