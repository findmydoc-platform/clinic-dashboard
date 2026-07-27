import type {
  DoctorProfile,
  DoctorProfileFields,
  DoctorProfileImageReplaceResult,
  DoctorProfileUpdate,
  DoctorSpecialtyAssignment,
  DoctorSpecialtyInput,
} from "./doctor-profile"

export type DoctorProfileImageInput = Readonly<{
  alt: string
  file: File
}>

export type DoctorProfileCommands = Readonly<{
  createDoctor: (input: DoctorProfileFields) => Promise<DoctorProfile>
  createSpecialty: (doctorId: string, input: DoctorSpecialtyInput) => Promise<DoctorSpecialtyAssignment>
  replaceImage: (doctorId: string, input: DoctorProfileImageInput) => Promise<DoctorProfileImageReplaceResult>
  updateDoctor: (doctorId: string, input: DoctorProfileUpdate) => Promise<DoctorProfile>
  updateSpecialty: (
    doctorId: string,
    assignmentId: string,
    input: DoctorSpecialtyInput,
  ) => Promise<DoctorSpecialtyAssignment>
}>
