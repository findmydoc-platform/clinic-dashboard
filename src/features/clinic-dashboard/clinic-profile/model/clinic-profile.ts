export type ClinicProfileFocusTarget =
  | "address"
  | "basic-information"
  | "conflict"
  | "gallery"
  | "languages"
  | "opening-hours"
  | "review-publish"
  | "treatments"

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
  updatedAt: string
}>
