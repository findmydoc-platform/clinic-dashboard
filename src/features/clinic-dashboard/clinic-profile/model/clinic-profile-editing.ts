import {
  clinicProfileWeekdayValues,
  createClinicProfileDraftInput,
  type ClinicProfileCity,
  type ClinicProfileDraftInput,
  type ClinicProfileOpeningHoursDay,
  type ClinicProfileSnapshot,
  type ClinicProfileSourceFields,
  type ClinicProfileWeekday,
} from "./clinic-profile-source"

export const clinicProfileLanguageLabels = {
  arabic: "Arabic",
  chinese: "Chinese",
  english: "English",
  french: "French",
  german: "German",
  italian: "Italian",
  japanese: "Japanese",
  korean: "Korean",
  portuguese: "Portuguese",
  russian: "Russian",
  spanish: "Spanish",
  turkish: "Turkish",
} as const

export const clinicProfileWeekdayLabels = {
  friday: "Friday",
  monday: "Monday",
  saturday: "Saturday",
  sunday: "Sunday",
  thursday: "Thursday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
} as const

export type ClinicProfileEditableField =
  | "name"
  | "descriptionText"
  | "supportedLanguages"
  | "address.street"
  | "address.houseNumber"
  | "address.cityId"
  | "address.zipCode"
  | `openingHours.${ClinicProfileWeekday}`

export type ClinicProfileValidationErrors = Readonly<Partial<Record<ClinicProfileEditableField, string>>>

export type ClinicProfileChange =
  | Readonly<{
      after: string
      before: string
      field: "name" | "descriptionText"
      kind: "text"
      label: string
      section: "profile"
    }>
  | Readonly<{
      after: string
      before: string
      field: ClinicProfileEditableField
      kind: "structured"
      label: string
      section: "address" | "hours" | "profile"
    }>

export type ClinicProfileChangeSet = Readonly<{
  changes: readonly ClinicProfileChange[]
  fieldCount: number
  sectionCount: number
}>

function cityName(cityId: string | undefined, cities: readonly ClinicProfileCity[]) {
  if (!cityId) return ""
  return cities.find((city) => city.id === cityId)?.name ?? ""
}

function normalizeDraft(input: ClinicProfileDraftInput) {
  return {
    ...input,
    address: { ...input.address },
    openingHours: input.openingHours
      ? Object.fromEntries(
          clinicProfileWeekdayValues.map((weekday) => [weekday, { ...input.openingHours?.[weekday] }]),
        )
      : undefined,
    supportedLanguages: [...input.supportedLanguages].sort(),
  }
}

export function areClinicProfileDraftInputsEqual(
  left: ClinicProfileDraftInput,
  right: ClinicProfileDraftInput,
) {
  return JSON.stringify(normalizeDraft(left)) === JSON.stringify(normalizeDraft(right))
}

export function clinicProfileDraftHasPublishedChanges(
  draft: ClinicProfileDraftInput,
  published: ClinicProfileSourceFields,
) {
  return !areClinicProfileDraftInputsEqual(draft, createClinicProfileDraftInput(published))
}

export type ClinicProfilePublishReconciliation = "conflict" | "not-published" | "published"

export function classifyClinicProfilePublishReconciliation(
  latest: ClinicProfileSnapshot,
  attemptedDraft: ClinicProfileDraftInput,
  expectedDraftRevision: number,
  expectedPublishedRevision: number,
): ClinicProfilePublishReconciliation {
  if (
    !latest.draft &&
    latest.published.revision !== expectedPublishedRevision &&
    areClinicProfileDraftInputsEqual(createClinicProfileDraftInput(latest.published), attemptedDraft)
  ) {
    return "published"
  }

  if (
    latest.draft?.revision === expectedDraftRevision &&
    latest.published.revision === expectedPublishedRevision &&
    areClinicProfileDraftInputsEqual(createClinicProfileDraftInput(latest.draft), attemptedDraft)
  ) {
    return "not-published"
  }

  return "conflict"
}

export function resolveClinicProfileDraftInput(
  input: ClinicProfileDraftInput,
  cities: readonly ClinicProfileCity[],
): ClinicProfileSourceFields {
  return {
    address: {
      city: input.address.cityId ? cities.find((city) => city.id === input.address.cityId) : undefined,
      country: { code: "TR", name: "Türkiye" },
      houseNumber: input.address.houseNumber,
      street: input.address.street,
      zipCode: input.address.zipCode,
    },
    descriptionText: input.descriptionText,
    name: input.name,
    openingHours: input.openingHours,
    supportedLanguages: input.supportedLanguages,
  }
}

export function formatClinicProfileOpeningHoursDay(day: ClinicProfileOpeningHoursDay | undefined) {
  if (!day) return "Not configured"
  if (day.isClosed) return "Closed"
  if (!day.opensAt || !day.closesAt) return "Incomplete"
  return `${day.opensAt}–${day.closesAt}`
}

export function createClinicProfileChangeSet(snapshot: ClinicProfileSnapshot): ClinicProfileChangeSet {
  const draft = snapshot.draft
  if (!draft) return { changes: [], fieldCount: 0, sectionCount: 0 }

  const published = createClinicProfileDraftInput(snapshot.published)
  const current = createClinicProfileDraftInput(draft)
  const changes: ClinicProfileChange[] = []

  if (published.name !== current.name) {
    changes.push({
      after: current.name,
      before: published.name,
      field: "name",
      kind: "text",
      label: "Clinic name",
      section: "profile",
    })
  }
  if (published.descriptionText !== current.descriptionText) {
    changes.push({
      after: current.descriptionText,
      before: published.descriptionText,
      field: "descriptionText",
      kind: "text",
      label: "Description",
      section: "profile",
    })
  }
  if (
    JSON.stringify([...published.supportedLanguages].sort()) !==
    JSON.stringify([...current.supportedLanguages].sort())
  ) {
    changes.push({
      after: current.supportedLanguages.map((language) => clinicProfileLanguageLabels[language]).join(", "),
      before: published.supportedLanguages
        .map((language) => clinicProfileLanguageLabels[language])
        .join(", "),
      field: "supportedLanguages",
      kind: "structured",
      label: "Languages",
      section: "profile",
    })
  }

  const addressFields = [
    ["street", "Street"],
    ["houseNumber", "House number"],
    ["cityId", "City"],
    ["zipCode", "Postal code"],
  ] as const
  for (const [field, label] of addressFields) {
    if (published.address[field] === current.address[field]) continue
    changes.push({
      after:
        field === "cityId"
          ? cityName(current.address.cityId, snapshot.availableCities)
          : (current.address[field] ?? ""),
      before:
        field === "cityId"
          ? cityName(published.address.cityId, snapshot.availableCities)
          : (published.address[field] ?? ""),
      field: `address.${field}`,
      kind: "structured",
      label,
      section: "address",
    })
  }

  for (const weekday of clinicProfileWeekdayValues) {
    const before = published.openingHours?.[weekday]
    const after = current.openingHours?.[weekday]
    if (JSON.stringify(before) === JSON.stringify(after)) continue
    changes.push({
      after: formatClinicProfileOpeningHoursDay(after),
      before: formatClinicProfileOpeningHoursDay(before),
      field: `openingHours.${weekday}`,
      kind: "structured",
      label: clinicProfileWeekdayLabels[weekday],
      section: "hours",
    })
  }

  return {
    changes,
    fieldCount: changes.length,
    sectionCount: new Set(changes.map((change) => change.section)).size,
  }
}

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

export function validateClinicProfileForPublish(
  input: ClinicProfileDraftInput,
): ClinicProfileValidationErrors {
  const errors: Partial<Record<ClinicProfileEditableField, string>> = {}

  if (!input.name.trim()) errors.name = "Enter the clinic name."
  if (!input.descriptionText.trim()) errors.descriptionText = "Enter the clinic description."
  if (!input.address.street.trim()) errors["address.street"] = "Enter the street."
  if (!input.address.houseNumber.trim()) {
    errors["address.houseNumber"] = "Enter the house number."
  }
  if (!input.address.cityId) errors["address.cityId"] = "Select a city."
  if (!input.address.zipCode.trim()) errors["address.zipCode"] = "Enter the postal code."
  if (input.supportedLanguages.length === 0) {
    errors.supportedLanguages = "Select at least one language."
  }

  for (const weekday of clinicProfileWeekdayValues) {
    const day = input.openingHours?.[weekday]
    if (!day || day.isClosed) continue
    if (!timePattern.test(day.opensAt) || !timePattern.test(day.closesAt)) {
      errors[`openingHours.${weekday}`] = "Enter a complete opening and closing time."
      continue
    }
    if (day.opensAt >= day.closesAt) {
      errors[`openingHours.${weekday}`] = "Closing time must be after opening time."
    }
  }

  return errors
}

export function createEmptyClinicProfileOpeningHours() {
  return Object.fromEntries(
    clinicProfileWeekdayValues.map((weekday) => [weekday, { closesAt: "", isClosed: true, opensAt: "" }]),
  ) as Record<ClinicProfileWeekday, ClinicProfileOpeningHoursDay>
}
