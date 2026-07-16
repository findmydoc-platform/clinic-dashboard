import type { StaticImageData } from "next/image"

export type ClinicTeamMember = {
  avatar?: StaticImageData | string
  biography: string
  id: string
  initials: string
  name: string
  specialty: string
}

export type ClinicTreatment = {
  category: string
  description: string
  duration: string
  id: string
  name: string
  price: string
}

export type ClinicOpeningHours = {
  days: string
  hours: string
}

export type ClinicGalleryItem = {
  alt: string
  id: string
  isCover: boolean
  src: StaticImageData | string
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

export function createClinicProfileEntityId(prefix: "team" | "treatment") {
  return `${prefix}-${globalThis.crypto.randomUUID()}`
}
