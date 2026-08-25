import "server-only"

import type { NextRequest } from "next/server"
import { composeClinicDashboardDataProviders } from "./data-provider-composition"
import { clinicDashboardDemoWorkspaceProvider } from "./demo/loader"
import { toDashboardClinicGallerySnapshot } from "./clinic-profile/server/clinic-gallery-dto"
import { getClinicDashboardAccess, getClinicDashboardAccessToken } from "./auth/server/public"
import {
  evaluateClinicProfileCompleteness,
  evaluateClinicProfileDraftCompleteness,
  handleClinicProfileDraftCreate as handleClinicProfileDraftCreateWithProvider,
  handleClinicProfileDraftDiscard as handleClinicProfileDraftDiscardWithProvider,
  handleClinicProfileDraftSave as handleClinicProfileDraftSaveWithProvider,
  handleClinicProfileLoad as handleClinicProfileLoadWithProvider,
  handleClinicProfilePublish as handleClinicProfilePublishWithProvider,
  handleClinicGalleryDiscard as handleClinicGalleryDiscardWithProvider,
  handleClinicGalleryImage as handleClinicGalleryImageWithProvider,
  handleClinicGalleryRead as handleClinicGalleryReadWithProvider,
  handleClinicGallerySave as handleClinicGallerySaveWithProvider,
  handleClinicGalleryUpload as handleClinicGalleryUploadWithProvider,
  handleClinicTreatmentCreate as handleClinicTreatmentCreateWithProvider,
  handleClinicTreatmentRead as handleClinicTreatmentReadWithProvider,
  handleClinicTreatmentUpdate as handleClinicTreatmentUpdateWithProvider,
  handleDoctorCreate as handleDoctorCreateWithProvider,
  handleDoctorImageReplace as handleDoctorImageReplaceWithProvider,
  handleDoctorSpecialtyCreate as handleDoctorSpecialtyCreateWithProvider,
  handleDoctorSpecialtyUpdate as handleDoctorSpecialtyUpdateWithProvider,
  handleDoctorUpdate as handleDoctorUpdateWithProvider,
  type ClinicProfileProviderFactory,
  type ClinicGalleryProviderFactory,
  type DoctorProfileProviderFactory,
  type ClinicTreatmentProviderFactory,
  type ClinicTreatmentsSnapshot,
} from "./clinic-profile/server/public"
import { createDashboardProfileProgress } from "./dashboard/server/public"
import {
  handleInquiryAttachmentDownload as handleInquiryAttachmentDownloadWithProvider,
  handleInquiryAttachmentDraftCreate as handleInquiryAttachmentDraftCreateWithProvider,
  handleInquiryAttachmentDraftDiscard as handleInquiryAttachmentDraftDiscardWithProvider,
  handleInquiryAttachmentDraftFinalize as handleInquiryAttachmentDraftFinalizeWithProvider,
  handleInquiryAttachmentDraftUpload as handleInquiryAttachmentDraftUploadWithProvider,
  handleInquiryAttachmentPreview as handleInquiryAttachmentPreviewWithProvider,
  handleInquiryContactReveal as handleInquiryContactRevealWithProvider,
  handleInquiryDetailLoad as handleInquiryDetailLoadWithProvider,
  handleInquiryMessageSend as handleInquiryMessageSendWithProvider,
  handleInquiryNoteAdd as handleInquiryNoteAddWithProvider,
  handleInquiryQueueLoad as handleInquiryQueueLoadWithProvider,
  handleInquiryReadPositionChange as handleInquiryReadPositionChangeWithProvider,
  handleInquiryStateChange as handleInquiryStateChangeWithProvider,
  type PatientInquiryProviderFactory,
  type PatientInquiryAttachmentDraftUploadFactory,
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

const createPatientInquiryAttachmentDraftUpload: PatientInquiryAttachmentDraftUploadFactory = (
  accessToken,
  clinicId,
) => composeClinicDashboardDataProviders(accessToken, clinicId).inquiryAttachmentDraftUpload

const createDoctorProfileProvider: DoctorProfileProviderFactory = (accessToken, clinicId) =>
  composeClinicDashboardDataProviders(accessToken, clinicId).doctors

const createClinicProfileProvider: ClinicProfileProviderFactory = (accessToken, clinicId) =>
  composeClinicDashboardDataProviders(accessToken, clinicId).profile

const createClinicGalleryProvider: ClinicGalleryProviderFactory = (accessToken, clinicId) =>
  composeClinicDashboardDataProviders(accessToken, clinicId).gallery

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

export function handleClinicGalleryRead(request: NextRequest) {
  return handleClinicGalleryReadWithProvider(request, createClinicGalleryProvider)
}

export function handleClinicGallerySave(request: NextRequest) {
  return handleClinicGallerySaveWithProvider(request, createClinicGalleryProvider)
}

export function handleClinicGalleryUpload(request: NextRequest) {
  return handleClinicGalleryUploadWithProvider(request, createClinicGalleryProvider)
}

export function handleClinicGalleryDiscard(request: NextRequest) {
  return handleClinicGalleryDiscardWithProvider(request, createClinicGalleryProvider)
}

export function handleClinicGalleryImage(request: NextRequest) {
  return handleClinicGalleryImageWithProvider(request, createClinicGalleryProvider)
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

export function handleInquiryQueueLoad(request: NextRequest) {
  return handleInquiryQueueLoadWithProvider(request, createPatientInquiryProvider)
}

export function handleInquiryDetailLoad(request: NextRequest) {
  return handleInquiryDetailLoadWithProvider(request, createPatientInquiryProvider)
}

export function handleInquiryMessageSend(request: NextRequest) {
  return handleInquiryMessageSendWithProvider(request, createPatientInquiryProvider)
}

export function handleInquiryNoteAdd(request: NextRequest) {
  return handleInquiryNoteAddWithProvider(request, createPatientInquiryProvider)
}

export function handleInquiryStateChange(request: NextRequest) {
  return handleInquiryStateChangeWithProvider(request, createPatientInquiryProvider)
}

export function handleInquiryReadPositionChange(request: NextRequest) {
  return handleInquiryReadPositionChangeWithProvider(request, createPatientInquiryProvider)
}

export function handleInquiryContactReveal(request: NextRequest) {
  return handleInquiryContactRevealWithProvider(request, createPatientInquiryProvider)
}

export function handleInquiryAttachmentDraftCreate(request: NextRequest) {
  return handleInquiryAttachmentDraftCreateWithProvider(request, createPatientInquiryProvider)
}

export function handleInquiryAttachmentDraftFinalize(request: NextRequest) {
  return handleInquiryAttachmentDraftFinalizeWithProvider(request, createPatientInquiryProvider)
}

export function handleInquiryAttachmentDraftUpload(request: NextRequest) {
  return handleInquiryAttachmentDraftUploadWithProvider(request, createPatientInquiryAttachmentDraftUpload)
}

export function handleInquiryAttachmentDraftDiscard(request: NextRequest) {
  return handleInquiryAttachmentDraftDiscardWithProvider(request, createPatientInquiryProvider)
}

export function handleInquiryAttachmentDownload(request: NextRequest) {
  return handleInquiryAttachmentDownloadWithProvider(request, createPatientInquiryProvider)
}

export function handleInquiryAttachmentPreview(request: NextRequest) {
  return handleInquiryAttachmentPreviewWithProvider(request, createPatientInquiryProvider)
}

function createUnavailableProfileProgress() {
  return createDashboardProfileProgress({
    gallery: { status: "temporarily-unavailable" },
    taskActionability: {
      canEditGallery: false,
      canEditProfile: false,
      canEditTreatments: false,
    },
    treatments: { catalogue: [], offerings: [], status: "temporarily-unavailable" },
  })
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
      galleryStatus: "temporarily-unavailable",
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
      profileProgress: createUnavailableProfileProgress(),
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
      galleryStatus: "temporarily-unavailable",
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
      profileProgress: createUnavailableProfileProgress(),
      treatmentSnapshot: { catalogue: [], offerings: [], status: "temporarily-unavailable" },
    }
  }

  const providers = composeClinicDashboardDataProviders(accessToken, access.context.clinic.id)
  const canViewProfile = access.context.capabilities.includes("clinic-profile:view")
  const canViewGallery = access.context.capabilities.includes("clinic-gallery:view")
  const canViewTreatments = access.context.capabilities.includes("clinic-treatments:view")
  const canViewInquiries = access.context.capabilities.includes("clinic-inquiries:view")
  const taskActionability = {
    canEditGallery: access.context.capabilities.includes("clinic-gallery:edit"),
    canEditProfile: access.context.capabilities.includes("clinic-profile:edit"),
    canEditTreatments: access.context.capabilities.includes("clinic-treatments:edit"),
  }
  const [doctorResult, galleryResult, inquiryResult, profileResult, reviewResult, treatmentResult] =
    await Promise.allSettled([
      providers.doctors.loadDirectory(),
      canViewGallery ? providers.gallery.loadGallery() : Promise.resolve(undefined),
      canViewInquiries
        ? providers.inquiries.loadQueue({ lifecycle: "open", unreadOnly: false })
        : Promise.resolve(undefined),
      canViewProfile ? providers.profile.loadSnapshot() : Promise.resolve(undefined),
      providers.reviews.loadReviews(defaultReviewListFilters, 1),
      canViewTreatments
        ? providers.treatments.loadTreatments()
        : Promise.resolve({ error: "forbidden", ok: false } as const),
    ])

  const gallerySourceSnapshot =
    galleryResult.status === "fulfilled" && galleryResult.value?.ok ? galleryResult.value.value : undefined
  const galleryStatus = !canViewGallery
    ? "forbidden"
    : gallerySourceSnapshot
      ? "ready"
      : "temporarily-unavailable"
  const profileSourceSnapshot =
    profileResult.status === "fulfilled" && profileResult.value?.ok ? profileResult.value.value : undefined
  const treatmentSnapshot: ClinicTreatmentsSnapshot =
    treatmentResult.status === "fulfilled" && treatmentResult.value.ok
      ? treatmentResult.value.value
      : {
          catalogue: [],
          offerings: [],
          status: canViewTreatments ? ("temporarily-unavailable" as const) : ("forbidden" as const),
        }
  const profileProgress = createDashboardProfileProgress({
    gallery: {
      ...(gallerySourceSnapshot ? { snapshot: gallerySourceSnapshot } : {}),
      status: galleryStatus,
    },
    profile: profileSourceSnapshot
      ? {
          draft: evaluateClinicProfileDraftCompleteness(profileSourceSnapshot),
          published: evaluateClinicProfileCompleteness(profileSourceSnapshot),
        }
      : undefined,
    taskActionability,
    treatments: treatmentSnapshot,
  })

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
    gallerySnapshot: gallerySourceSnapshot
      ? toDashboardClinicGallerySnapshot(gallerySourceSnapshot)
      : undefined,
    galleryStatus,
    inquiryQueue:
      inquiryResult.status === "fulfilled" && inquiryResult.value?.ok
        ? inquiryResult.value.value
        : { inquiries: [], status: "temporarily-unavailable" },
    profileProgress,
    profileSourceSnapshot,
    reviewSourceSnapshot:
      reviewResult.status === "fulfilled" && reviewResult.value.ok ? reviewResult.value.value : undefined,
    treatmentSnapshot,
  }
}
