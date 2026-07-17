export type ClinicProfileFocusTarget = "gallery" | "team"

export type ClinicProfileImageSource =
  | string
  | Readonly<{
      blurDataURL?: string
      blurHeight?: number
      blurWidth?: number
      height: number
      src: string
      width: number
    }>

export type ClinicTeamMember = Readonly<{
  avatar?: ClinicProfileImageSource
  biography: string
  id: string
  initials: string
  name: string
  specialty: string
}>

export type ClinicTeamMemberInput = Readonly<Omit<ClinicTeamMember, "id">>

export type MasterTreatment = Readonly<{
  id: string
  name: string
}>

export type ClinicTreatment = Readonly<{
  masterTreatmentId: string
  price: string
}>

export type ClinicTreatmentInput = ClinicTreatment

export type ClinicTreatmentView = Readonly<ClinicTreatment & { name: string }>

export type ClinicOpeningHours = Readonly<{
  days: string
  hours: string
}>

export type ClinicGalleryItem = Readonly<{
  alt: string
  id: string
  isCover: boolean
  src: ClinicProfileImageSource
}>

export type ClinicProfileDraft = Readonly<{
  address: Readonly<{
    city: string
    phone: string
    postalCode: string
    street: string
  }>
  description: string
  gallery: readonly ClinicGalleryItem[]
  galleryTotal: number
  id: string
  name: string
  openingHours: readonly ClinicOpeningHours[]
  revision: number
  specialties: readonly string[]
  team: readonly ClinicTeamMember[]
  treatments: readonly ClinicTreatment[]
  updatedAt: string
}>

export function cloneClinicProfile(profile: ClinicProfileDraft): ClinicProfileDraft {
  return {
    ...profile,
    address: { ...profile.address },
    gallery: profile.gallery.map((item) => ({ ...item })),
    openingHours: profile.openingHours.map((entry) => ({ ...entry })),
    specialties: [...profile.specialties],
    team: profile.team.map((member) => ({ ...member })),
    treatments: profile.treatments.map((treatment) => ({ ...treatment })),
  }
}

export function isClinicProfileDirty(saved: ClinicProfileDraft, draft: ClinicProfileDraft) {
  return JSON.stringify(saved) !== JSON.stringify(draft)
}

export function getTeamMemberInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}
