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

export type ClinicTeamMember = {
  avatar?: ClinicProfileImageSource
  biography: string
  id: string
  initials: string
  name: string
  specialty: string
}

export type ClinicTeamMemberInput = Readonly<Omit<ClinicTeamMember, "id">>

export type ClinicTreatment = {
  category: string
  description: string
  duration: string
  id: string
  name: string
  price: string
}

export type ClinicTreatmentInput = Readonly<Omit<ClinicTreatment, "id">>

export type ClinicOpeningHours = {
  days: string
  hours: string
}

export type ClinicGalleryItem = {
  alt: string
  id: string
  isCover: boolean
  src: ClinicProfileImageSource
}

export type ClinicProfileDraft = {
  address: {
    city: string
    phone: string
    postalCode: string
    street: string
  }
  description: string
  gallery: ClinicGalleryItem[]
  galleryTotal: number
  id: string
  name: string
  openingHours: ClinicOpeningHours[]
  revision: number
  specialties: string[]
  team: ClinicTeamMember[]
  treatments: ClinicTreatment[]
  updatedAt: string
}

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
