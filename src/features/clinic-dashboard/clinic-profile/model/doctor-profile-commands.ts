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

export class DoctorProfileCommandError extends Error {
  readonly outcome: "rejected" | "unknown"

  constructor(outcome: "rejected" | "unknown", message: string) {
    super(message)
    this.name = "DoctorProfileCommandError"
    this.outcome = outcome
  }
}

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
