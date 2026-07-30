import "server-only"

import type { NextRequest } from "next/server"
import { composeClinicDashboardDataProviders } from "./data-provider-composition"
import { clinicDashboardDemoWorkspaceProvider } from "./demo/loader"
import { getClinicDashboardAccess, getClinicDashboardAccessToken } from "./auth/server/public"
import {
  handleClinicProfileDraftDiscard as handleClinicProfileDraftDiscardWithProvider,
  handleClinicProfileDraftSave as handleClinicProfileDraftSaveWithProvider,
  handleClinicProfileLoad as handleClinicProfileLoadWithProvider,
  handleClinicProfilePublish as handleClinicProfilePublishWithProvider,
  handleDoctorCreate as handleDoctorCreateWithProvider,
  handleDoctorImageReplace as handleDoctorImageReplaceWithProvider,
  handleDoctorSpecialtyCreate as handleDoctorSpecialtyCreateWithProvider,
  handleDoctorSpecialtyUpdate as handleDoctorSpecialtyUpdateWithProvider,
  handleDoctorUpdate as handleDoctorUpdateWithProvider,
  type ClinicProfileProviderFactory,
  type DoctorProfileProviderFactory,
} from "./clinic-profile/server/public"
import {
  handlePatientInquiryStatusUpdate as handlePatientInquiryStatusUpdateWithProvider,
  type PatientInquiryProviderFactory,
} from "./messages/server/public"
import type { ClinicDashboardWorkspaceInput } from "./workspace/model/workspace-input"

export { getClinicDashboardAccess } from "./auth/server/public"

const createPatientInquiryProvider: PatientInquiryProviderFactory = (accessToken, clinicId) =>
  composeClinicDashboardDataProviders(accessToken, clinicId).inquiries

const createDoctorProfileProvider: DoctorProfileProviderFactory = (accessToken, clinicId) =>
  composeClinicDashboardDataProviders(accessToken, clinicId).doctors

const createClinicProfileProvider: ClinicProfileProviderFactory = (accessToken, clinicId) =>
  composeClinicDashboardDataProviders(accessToken, clinicId).profile

export function handleClinicProfileLoad(request: NextRequest) {
  return handleClinicProfileLoadWithProvider(request, createClinicProfileProvider)
}

export function handleClinicProfileDraftSave(request: NextRequest) {
  return handleClinicProfileDraftSaveWithProvider(request, createClinicProfileProvider)
}

export function handleClinicProfileDraftDiscard(request: NextRequest) {
  return handleClinicProfileDraftDiscardWithProvider(request, createClinicProfileProvider)
}

export function handleClinicProfilePublish(request: NextRequest) {
  return handleClinicProfilePublishWithProvider(request, createClinicProfileProvider)
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
    }
  }

  const providers = composeClinicDashboardDataProviders(accessToken, access.context.clinic.id)
  const [doctorResult, inquiryResult, profileResult] = await Promise.allSettled([
    providers.doctors.loadDirectory(),
    providers.inquiries.loadQueue(),
    providers.profile.loadSnapshot(),
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
      profileResult.status === "fulfilled" && profileResult.value.ok ? profileResult.value.value : undefined,
  }
}
