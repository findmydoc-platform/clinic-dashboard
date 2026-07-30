import "server-only"

import type {
  DoctorDirectoryReadySnapshot,
  DoctorProfile,
  DoctorProfileFields,
  DoctorProfileImageReplaceResult,
  DoctorProfileUpdate,
  DoctorSpecialtyAssignment,
  DoctorSpecialtyInput,
} from "../model/doctor-profile"

export type DoctorProfileReadError = "forbidden" | "temporarily-unavailable" | "unauthorized"

export type DoctorProfileChangeError =
  DoctorProfileReadError | "conflict" | "invalid-data" | "invalid-input" | "not-found"

export type DoctorProfileProviderResult<TValue, TError extends string> =
  | Readonly<{
      ok: true
      value: TValue
    }>
  | Readonly<{
      error: TError
      ok: false
    }>

export type DoctorProfileImageUpload = Readonly<{
  alt: string
  bytes: Uint8Array
  fileName: string
  mimeType: string
}>

export type DoctorProfileProvider = Readonly<{
  createDoctor: (
    input: DoctorProfileFields,
  ) => Promise<DoctorProfileProviderResult<DoctorProfile, DoctorProfileChangeError>>
  createSpecialty: (
    doctorId: string,
    input: DoctorSpecialtyInput,
  ) => Promise<DoctorProfileProviderResult<DoctorSpecialtyAssignment, DoctorProfileChangeError>>
  loadDirectory: () => Promise<
    DoctorProfileProviderResult<DoctorDirectoryReadySnapshot, DoctorProfileReadError>
  >
  replaceImage: (
    doctorId: string,
    input: DoctorProfileImageUpload,
  ) => Promise<DoctorProfileProviderResult<DoctorProfileImageReplaceResult, DoctorProfileChangeError>>
  updateDoctor: (
    doctorId: string,
    input: DoctorProfileUpdate,
  ) => Promise<DoctorProfileProviderResult<DoctorProfile, DoctorProfileChangeError>>
  updateSpecialty: (
    doctorId: string,
    assignmentId: string,
    input: DoctorSpecialtyInput,
  ) => Promise<DoctorProfileProviderResult<DoctorSpecialtyAssignment, DoctorProfileChangeError>>
}>

export type DoctorProfileProviderFactory = (accessToken: string, clinicId: string) => DoctorProfileProvider
