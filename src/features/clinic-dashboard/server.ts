import "server-only"

import type { NextRequest } from "next/server"
import { composeClinicDashboardDataProviders } from "./data-provider-composition"
import { clinicDashboardDemoWorkspaceProvider } from "./demo/loader"
import { getClinicDashboardAccess, getClinicDashboardAccessToken } from "./auth/server/public"
import {
  handleClinicTreatmentCreate as handleClinicTreatmentCreateWithProvider,
  handleClinicTreatmentRead as handleClinicTreatmentReadWithProvider,
  handleClinicTreatmentUpdate as handleClinicTreatmentUpdateWithProvider,
  handleDoctorCreate as handleDoctorCreateWithProvider,
  handleDoctorImageReplace as handleDoctorImageReplaceWithProvider,
  handleDoctorSpecialtyCreate as handleDoctorSpecialtyCreateWithProvider,
  handleDoctorSpecialtyUpdate as handleDoctorSpecialtyUpdateWithProvider,
  handleDoctorUpdate as handleDoctorUpdateWithProvider,
  type DoctorProfileProviderFactory,
  type ClinicTreatmentProviderFactory,
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

const createClinicTreatmentProvider: ClinicTreatmentProviderFactory = (accessToken, clinicId) =>
  composeClinicDashboardDataProviders(accessToken, clinicId).treatments

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
  const canViewTreatments = access.context.capabilities.includes("clinic-treatments:view")
  const [doctorResult, inquiryResult, treatmentResult] = await Promise.allSettled([
    providers.doctors.loadDirectory(),
    providers.inquiries.loadQueue(),
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
