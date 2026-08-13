import "server-only"

import type { NextRequest } from "next/server"
import { composeClinicDashboardDataProviders } from "./data-provider-composition"
import { clinicDashboardDemoWorkspaceProvider } from "./demo/loader"
import { getClinicDashboardAccess, getClinicDashboardAccessToken } from "./auth/server/public"
import {
  handleClinicProfileDraftCreate as handleClinicProfileDraftCreateWithProvider,
  handleClinicProfileDraftDiscard as handleClinicProfileDraftDiscardWithProvider,
  handleClinicProfileDraftSave as handleClinicProfileDraftSaveWithProvider,
  handleClinicProfileLoad as handleClinicProfileLoadWithProvider,
  handleClinicProfilePublish as handleClinicProfilePublishWithProvider,
  handleClinicTreatmentCreate as handleClinicTreatmentCreateWithProvider,
  handleClinicTreatmentRead as handleClinicTreatmentReadWithProvider,
  handleClinicTreatmentUpdate as handleClinicTreatmentUpdateWithProvider,
  handleDoctorCreate as handleDoctorCreateWithProvider,
  handleDoctorImageReplace as handleDoctorImageReplaceWithProvider,
  handleDoctorSpecialtyCreate as handleDoctorSpecialtyCreateWithProvider,
  handleDoctorSpecialtyUpdate as handleDoctorSpecialtyUpdateWithProvider,
  handleDoctorUpdate as handleDoctorUpdateWithProvider,
  type ClinicProfileProviderFactory,
  type DoctorProfileProviderFactory,
  type ClinicTreatmentProviderFactory,
} from "./clinic-profile/server/public"
import {
  handlePatientInquiryStatusUpdate as handlePatientInquiryStatusUpdateWithProvider,
  type PatientInquiryProviderFactory,
} from "./messages/server/public"
import type { ClinicDashboardWorkspaceInput } from "./workspace/model/workspace-input"
import { defaultReviewListFilters } from "./reviews/model/review-source"
import {
  handleReviewAppealSubmit as handleReviewAppealSubmitWithProvider,
  handleReviewHistoryLoad as handleReviewHistoryLoadWithProvider,
  handleReviewListLoad as handleReviewListLoadWithProvider,
  handleReviewResponseSubmit as handleReviewResponseSubmitWithProvider,
} from "./reviews/server/actions"
import type { ReviewProviderFactory } from "./reviews/server/review-provider"

export { getClinicDashboardAccess } from "./auth/server/public"

const createPatientInquiryProvider: PatientInquiryProviderFactory = (accessToken, clinicId) =>
  composeClinicDashboardDataProviders(accessToken, clinicId).inquiries

const createDoctorProfileProvider: DoctorProfileProviderFactory = (accessToken, clinicId) =>
  composeClinicDashboardDataProviders(accessToken, clinicId).doctors

const createClinicProfileProvider: ClinicProfileProviderFactory = (accessToken, clinicId) =>
  composeClinicDashboardDataProviders(accessToken, clinicId).profile

const createReviewProvider: ReviewProviderFactory = (accessToken, clinicId) =>
  composeClinicDashboardDataProviders(accessToken, clinicId).reviews

const createClinicTreatmentProvider: ClinicTreatmentProviderFactory = (accessToken, clinicId) =>
  composeClinicDashboardDataProviders(accessToken, clinicId).treatments

export function handleReviewListLoad(request: NextRequest) {
  return handleReviewListLoadWithProvider(request, createReviewProvider)
}

export function handleReviewResponseSubmit(request: NextRequest, reviewId: string) {
  return handleReviewResponseSubmitWithProvider(request, reviewId, createReviewProvider)
}

export function handleReviewAppealSubmit(request: NextRequest, reviewId: string) {
  return handleReviewAppealSubmitWithProvider(request, reviewId, createReviewProvider)
}

export function handleReviewHistoryLoad(request: NextRequest, reviewId: string) {
  return handleReviewHistoryLoadWithProvider(request, reviewId, createReviewProvider)
}

export function handleClinicProfileLoad(request: NextRequest) {
  return handleClinicProfileLoadWithProvider(request, createClinicProfileProvider)
}

export function handleClinicProfileDraftSave(request: NextRequest) {
  return handleClinicProfileDraftSaveWithProvider(request, createClinicProfileProvider)
}

export function handleClinicProfileDraftCreate(request: NextRequest) {
  return handleClinicProfileDraftCreateWithProvider(request, createClinicProfileProvider)
}

export function handleClinicProfileDraftDiscard(request: NextRequest) {
  return handleClinicProfileDraftDiscardWithProvider(request, createClinicProfileProvider)
}

export function handleClinicProfilePublish(request: NextRequest) {
  return handleClinicProfilePublishWithProvider(request, createClinicProfileProvider)
}

export function handleClinicTreatmentRead(request: NextRequest) {
  return handleClinicTreatmentReadWithProvider(request, createClinicTreatmentProvider)
}

export function handleClinicTreatmentCreate(request: NextRequest) {
  return handleClinicTreatmentCreateWithProvider(request, createClinicTreatmentProvider)
}

export function handleClinicTreatmentUpdate(request: NextRequest) {
  return handleClinicTreatmentUpdateWithProvider(request, createClinicTreatmentProvider)
}

export function handleDoctorCreate(request: NextRequest) {
  return handleDoctorCreateWithProvider(request, createDoctorProfileProvider)
}

export function handleDoctorUpdate(request: NextRequest, doctorId: string) {
  return handleDoctorUpdateWithProvider(request, doctorId, createDoctorProfileProvider)
}

export function handleDoctorSpecialtyCreate(request: NextRequest, doctorId: string) {
  return handleDoctorSpecialtyCreateWithProvider(request, doctorId, createDoctorProfileProvider)
}

export function handleDoctorSpecialtyUpdate(request: NextRequest, doctorId: string, assignmentId: string) {
  return handleDoctorSpecialtyUpdateWithProvider(request, doctorId, assignmentId, createDoctorProfileProvider)
}

export function handleDoctorImageReplace(request: NextRequest, doctorId: string) {
  return handleDoctorImageReplaceWithProvider(request, doctorId, createDoctorProfileProvider)
}

export function handlePatientInquiryStatusUpdate(request: NextRequest, inquiryId: string) {
  return handlePatientInquiryStatusUpdateWithProvider(request, inquiryId, createPatientInquiryProvider)
}

export async function loadClinicDashboardWorkspaceInput(): Promise<ClinicDashboardWorkspaceInput> {
  const workspace = await clinicDashboardDemoWorkspaceProvider.loadWorkspace()
  const accessToken = await getClinicDashboardAccessToken()
  if (!accessToken) {
    return {
      ...workspace,
      doctorDirectory: {
        doctors: [],
        medicalSpecialties: [],
        status: "temporarily-unavailable",
      },
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
      treatmentSnapshot: { catalogue: [], offerings: [], status: "temporarily-unavailable" },
    }
  }

  const access = await getClinicDashboardAccess().catch(
    () => ({ status: "temporarily-unavailable" }) as const,
  )
  if (access.status !== "approved") {
    return {
      ...workspace,
      doctorDirectory: {
        doctors: [],
        medicalSpecialties: [],
        status: "temporarily-unavailable",
      },
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
      treatmentSnapshot: { catalogue: [], offerings: [], status: "temporarily-unavailable" },
    }
  }

  const providers = composeClinicDashboardDataProviders(accessToken, access.context.clinic.id)
  const canViewProfile = access.context.capabilities.includes("clinic-profile:view")
  const canViewTreatments = access.context.capabilities.includes("clinic-treatments:view")
  const [doctorResult, inquiryResult, profileResult, reviewResult, treatmentResult] =
    await Promise.allSettled([
      providers.doctors.loadDirectory(),
      providers.inquiries.loadQueue(),
      canViewProfile ? providers.profile.loadSnapshot() : Promise.resolve(undefined),
      providers.reviews.loadReviews(defaultReviewListFilters, 1),
      canViewTreatments
        ? providers.treatments.loadTreatments()
        : Promise.resolve({ error: "forbidden", ok: false } as const),
    ])

  return {
    ...workspace,
    doctorDirectory:
      doctorResult.status === "fulfilled" && doctorResult.value.ok
        ? doctorResult.value.value
        : {
            doctors: [],
            medicalSpecialties: [],
            status: "temporarily-unavailable",
          },
    inquiryQueue:
      inquiryResult.status === "fulfilled" && inquiryResult.value.ok
        ? inquiryResult.value.value
        : { inquiries: [], status: "temporarily-unavailable" },
    profileSourceSnapshot:
      profileResult.status === "fulfilled" && profileResult.value?.ok ? profileResult.value.value : undefined,
    reviewSourceSnapshot:
      reviewResult.status === "fulfilled" && reviewResult.value.ok ? reviewResult.value.value : undefined,
    treatmentSnapshot:
      treatmentResult.status === "fulfilled" && treatmentResult.value.ok
        ? treatmentResult.value.value
        : {
            catalogue: [],
            offerings: [],
            status: canViewTreatments ? "temporarily-unavailable" : "forbidden",
          },
  }
}
