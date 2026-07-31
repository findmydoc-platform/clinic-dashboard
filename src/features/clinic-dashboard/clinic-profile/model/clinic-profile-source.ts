export const clinicProfileSupportedLanguageValues = [
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

export const clinicProfileWeekdayValues = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

export const clinicProfileCountry = {
  code: "TR",
  name: "Türkiye",
} as const

export const clinicProfileSourceFieldLimits = {
  cityNameLength: 160,
  descriptionTextLength: 10_000,
  houseNumberLength: 40,
  nameLength: 180,
  streetLength: 200,
  zipCodeLength: 32,
} as const

export type ClinicProfileSupportedLanguage = (typeof clinicProfileSupportedLanguageValues)[number]
export type ClinicProfileWeekday = (typeof clinicProfileWeekdayValues)[number]

export type ClinicProfileCity = Readonly<{
  id: string
  name: string
}>

export type ClinicProfileOpeningHoursDay = Readonly<{
  closesAt: string
  isClosed: boolean
  opensAt: string
}>

export type ClinicProfileOpeningHours = Readonly<Record<ClinicProfileWeekday, ClinicProfileOpeningHoursDay>>

export type ClinicProfileSourceAddress = Readonly<{
  city?: ClinicProfileCity
  country: typeof clinicProfileCountry
  houseNumber: string
  street: string
  zipCode: string
}>

export type ClinicProfileSourceFields = Readonly<{
  address: ClinicProfileSourceAddress
  descriptionText: string
  name: string
  openingHours?: ClinicProfileOpeningHours
  supportedLanguages: readonly ClinicProfileSupportedLanguage[]
}>

export type PublishedClinicProfile = Readonly<
  ClinicProfileSourceFields & {
    revision: number
  }
>

export type PersistentClinicProfileDraft = Readonly<
  ClinicProfileSourceFields & {
    basePublishedRevision: number
    revision: number
  }
>

export type ClinicProfileSnapshot = Readonly<{
  availableCities: readonly ClinicProfileCity[]
  draft?: PersistentClinicProfileDraft
  published: PublishedClinicProfile
}>

export type ClinicProfileDraftInput = Readonly<{
  address: Readonly<{
    cityId?: string
    houseNumber: string
    street: string
    zipCode: string
  }>
  descriptionText: string
  name: string
  openingHours?: ClinicProfileOpeningHours
  supportedLanguages: readonly ClinicProfileSupportedLanguage[]
}>

export type ClinicProfileDraftCreateInput = Readonly<{
  expectedPublishedRevision: number
}>

export type ClinicProfileDraftSaveInput = Readonly<{
  draft: ClinicProfileDraftInput
  expectedDraftRevision: number
  expectedPublishedRevision: number
}>

export type ClinicProfileDraftDiscardInput = Readonly<{
  expectedDraftRevision: number
}>

export type ClinicProfilePublishInput = Readonly<{
  expectedDraftRevision: number
  expectedPublishedRevision: number
}>

function cloneOpeningHours(
  openingHours: ClinicProfileOpeningHours | undefined,
): ClinicProfileOpeningHours | undefined {
  if (!openingHours) return undefined

  return {
    monday: { ...openingHours.monday },
    tuesday: { ...openingHours.tuesday },
    wednesday: { ...openingHours.wednesday },
    thursday: { ...openingHours.thursday },
    friday: { ...openingHours.friday },
    saturday: { ...openingHours.saturday },
    sunday: { ...openingHours.sunday },
  }
}

function cloneSourceFields<TProfile extends ClinicProfileSourceFields>(profile: TProfile): TProfile {
  return {
    ...profile,
    address: {
      ...profile.address,
      city: profile.address.city ? { ...profile.address.city } : undefined,
      country: { ...profile.address.country },
    },
    openingHours: cloneOpeningHours(profile.openingHours),
    supportedLanguages: [...profile.supportedLanguages],
  }
}

export function cloneClinicProfileSourceSnapshot(snapshot: ClinicProfileSnapshot): ClinicProfileSnapshot {
  return {
    availableCities: snapshot.availableCities.map((city) => ({ ...city })),
    draft: snapshot.draft ? cloneSourceFields(snapshot.draft) : undefined,
    published: cloneSourceFields(snapshot.published),
  }
}

export function createClinicProfileDraftInput(profile: ClinicProfileSourceFields): ClinicProfileDraftInput {
  return {
    address: {
      cityId: profile.address.city?.id,
      houseNumber: profile.address.houseNumber,
      street: profile.address.street,
      zipCode: profile.address.zipCode,
    },
    descriptionText: profile.descriptionText,
    name: profile.name,
    openingHours: cloneOpeningHours(profile.openingHours),
    supportedLanguages: [...profile.supportedLanguages],
  }
}
