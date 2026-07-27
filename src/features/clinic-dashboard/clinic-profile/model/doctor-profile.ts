export const doctorTitleValues = ["dr", "specialist", "surgeon", "assoc_prof", "prof_dr"] as const

export const doctorGenderValues = ["female", "male"] as const

export const doctorLanguageValues = [
  "german",
  "english",
  "french",
  "spanish",
  "italian",
  "turkish",
  "russian",
  "arabic",
  "chinese",
  "japanese",
  "korean",
  "portuguese",
] as const

export const doctorSpecializationLevelValues = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
  "specialist",
] as const

export const doctorProfileFieldLimits = {
  biographyLength: 10_000,
  qualificationCount: 30,
  shortTextLength: 120,
} as const

export type DoctorTitle = (typeof doctorTitleValues)[number]
export type DoctorGender = (typeof doctorGenderValues)[number]
export type DoctorLanguage = (typeof doctorLanguageValues)[number]
export type DoctorSpecializationLevel = (typeof doctorSpecializationLevelValues)[number]

export type DoctorProfileImage = Readonly<{
  alt: string
  id: string
  url?: string
}>

export type DoctorProfileImageReplaceResult = Readonly<{
  cleanupPending: boolean
  profile: DoctorProfile
}>

export type DoctorSpecialtyAssignment = Readonly<{
  id: string
  medicalSpecialtyId: string
  medicalSpecialtyName: string
  specializationLevel: DoctorSpecializationLevel
}>

export type DoctorProfile = Readonly<{
  active: boolean
  biography?: string
  experienceYears?: number
  firstName: string
  gender: DoctorGender
  id: string
  image?: DoctorProfileImage
  languages: readonly DoctorLanguage[]
  lastName: string
  qualifications: readonly string[]
  specialties: readonly DoctorSpecialtyAssignment[]
  title?: DoctorTitle
}>

export type MedicalSpecialtyOption = Readonly<{
  id: string
  name: string
  parentSpecialtyId?: string
  parentSpecialtyName?: string
}>

export type DoctorDirectoryReadySnapshot = Readonly<{
  doctors: readonly DoctorProfile[]
  medicalSpecialties: readonly MedicalSpecialtyOption[]
  status: "ready"
}>

export type DoctorDirectorySnapshot =
  | DoctorDirectoryReadySnapshot
  | Readonly<{
      doctors: readonly []
      medicalSpecialties: readonly []
      status: "temporarily-unavailable"
    }>

export type DoctorProfileFields = Readonly<{
  biography?: string
  experienceYears?: number
  firstName: string
  gender: DoctorGender
  languages: readonly DoctorLanguage[]
  lastName: string
  qualifications: readonly string[]
  title?: DoctorTitle
}>

export type DoctorProfileUpdate = Readonly<
  Omit<Partial<DoctorProfileFields>, "biography" | "experienceYears" | "title"> & {
    active?: boolean
    biography?: string | null
    experienceYears?: number | null
    title?: DoctorTitle | null
  }
>

export type DoctorSpecialtyInput = Readonly<{
  medicalSpecialtyId: string
  specializationLevel: DoctorSpecializationLevel
}>
