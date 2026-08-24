import { createClinicProfileChangeSet, validateClinicProfileForPublish } from "./clinic-profile-editing"
import {
  clinicProfileCountry,
  clinicProfileWeekdayValues,
  createClinicProfileDraftInput,
  type ClinicProfileSnapshot,
  type ClinicProfileSourceFields,
} from "./clinic-profile-source"

export type ClinicProfileCompletenessAreaId = "basic-information" | "address" | "languages" | "opening-hours"

export type ClinicProfileCompletenessMissingFieldId =
  | "name"
  | "descriptionText"
  | "address.street"
  | "address.houseNumber"
  | "address.cityId"
  | "address.zipCode"
  | "supportedLanguages"
  | `openingHours.${"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"}`

export type ClinicProfileCompletenessArea = Readonly<{
  complete: boolean
  id: ClinicProfileCompletenessAreaId
  missingFields: readonly ClinicProfileCompletenessMissingFieldId[]
}>

export type ClinicProfileCompletenessSystemContractError = Readonly<{
  reason: "invalid-country-context"
  status: "system-contract-error"
}>

export type ClinicProfileCompletenessReady = Readonly<{
  areas: readonly ClinicProfileCompletenessArea[]
  completedAreaCount: number
  status: "ready"
}>

export type ClinicProfileCompletenessResult =
  ClinicProfileCompletenessReady | ClinicProfileCompletenessSystemContractError

export type ClinicProfileDraftState = "none" | "incomplete" | "publish-ready" | "conflict"

export type ClinicProfileDraftCompleteness = Readonly<{
  changedAreas: readonly ClinicProfileCompletenessAreaId[]
  completedAreaCount: number
  missingAreas: readonly ClinicProfileCompletenessAreaId[]
  state: ClinicProfileDraftState
}>

const clinicProfileCompletenessAreaIds = [
  "basic-information",
  "address",
  "languages",
  "opening-hours",
] as const satisfies readonly ClinicProfileCompletenessAreaId[]

function hasValidCountryContext(profile: ClinicProfileSourceFields) {
  return (
    profile.address.country.code === clinicProfileCountry.code &&
    profile.address.country.name === clinicProfileCountry.name
  )
}

function createArea(
  id: ClinicProfileCompletenessAreaId,
  missingFields: readonly ClinicProfileCompletenessMissingFieldId[],
): ClinicProfileCompletenessArea {
  return { complete: missingFields.length === 0, id, missingFields }
}

function evaluateSourceFields(profile: ClinicProfileSourceFields) {
  const input = createClinicProfileDraftInput(profile)
  const errors = validateClinicProfileForPublish(input)
  const missingOpeningHours = clinicProfileWeekdayValues
    .filter((weekday) => {
      const day = profile.openingHours?.[weekday]
      if (!day) return true
      if (day.isClosed) return day.opensAt !== "" || day.closesAt !== ""
      return Boolean(errors[`openingHours.${weekday}`])
    })
    .map((weekday) => `openingHours.${weekday}` as const)
  const areas = [
    createArea(
      "basic-information",
      (["name", "descriptionText"] as const).filter((field) => Boolean(errors[field])),
    ),
    createArea(
      "address",
      (["address.street", "address.houseNumber", "address.cityId", "address.zipCode"] as const).filter(
        (field) => Boolean(errors[field]),
      ),
    ),
    createArea("languages", errors.supportedLanguages ? ["supportedLanguages"] : []),
    createArea("opening-hours", missingOpeningHours),
  ] satisfies readonly ClinicProfileCompletenessArea[]

  return {
    areas,
    completedAreaCount: areas.filter((area) => area.complete).length,
    status: "ready",
  } satisfies ClinicProfileCompletenessReady
}

function areaIdForChangedField(field: string): ClinicProfileCompletenessAreaId {
  if (field === "name" || field === "descriptionText") return "basic-information"
  if (field === "supportedLanguages") return "languages"
  if (field.startsWith("address.")) return "address"
  return "opening-hours"
}

export function evaluateClinicProfileCompleteness(
  snapshot: ClinicProfileSnapshot,
): ClinicProfileCompletenessResult {
  if (
    !hasValidCountryContext(snapshot.published) ||
    (snapshot.draft !== undefined && !hasValidCountryContext(snapshot.draft))
  ) {
    return { reason: "invalid-country-context", status: "system-contract-error" }
  }
  return evaluateSourceFields(snapshot.published)
}

export function evaluateClinicProfileDraftCompleteness(
  snapshot: ClinicProfileSnapshot,
): ClinicProfileDraftCompleteness {
  const sourceEvaluation = evaluateSourceFields(snapshot.draft ?? snapshot.published)
  const changedAreaSet = new Set(
    createClinicProfileChangeSet(snapshot).changes.map((change) => areaIdForChangedField(change.field)),
  )
  const changedAreas = clinicProfileCompletenessAreaIds.filter((areaId) => changedAreaSet.has(areaId))
  const missingAreas = sourceEvaluation.areas.filter((area) => !area.complete).map((area) => area.id)
  return {
    changedAreas,
    completedAreaCount: sourceEvaluation.completedAreaCount,
    missingAreas,
    state:
      snapshot.draft?.basePublishedRevision !== undefined &&
      snapshot.draft.basePublishedRevision !== snapshot.published.revision
        ? "conflict"
        : changedAreas.length === 0
          ? "none"
          : missingAreas.length === 0
            ? "publish-ready"
            : "incomplete",
  }
}
