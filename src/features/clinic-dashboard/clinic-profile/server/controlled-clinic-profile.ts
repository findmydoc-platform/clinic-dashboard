import "server-only"

import {
  clinicProfileCountry,
  clinicProfileWeekdayValues,
  cloneClinicProfileSourceSnapshot,
  type ClinicProfileDraftInput,
  type ClinicProfileOpeningHours,
  type ClinicProfileSnapshot,
  type ClinicProfileSourceFields,
  type PersistentClinicProfileDraft,
  type PublishedClinicProfile,
} from "../model/clinic-profile-source"
import type { ClinicProfileProvider } from "./clinic-profile-provider"

const availableCities = [
  { id: "city-istanbul", name: "Istanbul" },
  { id: "city-ankara", name: "Ankara" },
  { id: "city-izmir", name: "Izmir" },
] as const

const weekdayHours = {
  closesAt: "18:00",
  isClosed: false,
  opensAt: "09:00",
} as const

const initialPublishedProfile = {
  address: {
    city: availableCities[0],
    country: clinicProfileCountry,
    houseNumber: "12",
    street: "Bağdat Avenue",
    zipCode: "34728",
  },
  descriptionText:
    "A multidisciplinary clinic supporting international patients with coordinated treatment planning.",
  name: "Controlled Bosphorus Clinic",
  openingHours: {
    friday: weekdayHours,
    monday: weekdayHours,
    saturday: { closesAt: "", isClosed: true, opensAt: "" },
    sunday: { closesAt: "", isClosed: true, opensAt: "" },
    thursday: weekdayHours,
    tuesday: weekdayHours,
    wednesday: weekdayHours,
  },
  revision: 1,
  supportedLanguages: ["english", "turkish", "german"],
} as const satisfies PublishedClinicProfile

type ControlledClinicProfileState = {
  persistentDraft?: PersistentClinicProfileDraft
  publishedProfile: PublishedClinicProfile
}

function controlledState() {
  const controlledGlobal = globalThis as typeof globalThis & {
    __findmydocControlledClinicProfile?: ControlledClinicProfileState
  }
  controlledGlobal.__findmydocControlledClinicProfile ??= {
    publishedProfile: initialPublishedProfile,
  }
  return controlledGlobal.__findmydocControlledClinicProfile
}

function currentSnapshot(): ClinicProfileSnapshot {
  const state = controlledState()
  return cloneClinicProfileSourceSnapshot({
    availableCities,
    draft: state.persistentDraft,
    published: state.publishedProfile,
  })
}

function cityForId(cityId: string | undefined) {
  return cityId ? availableCities.find((city) => city.id === cityId) : undefined
}

function fieldsFromDraftInput(input: ClinicProfileDraftInput): ClinicProfileSourceFields | undefined {
  const city = cityForId(input.address.cityId)
  if (input.address.cityId && !city) return undefined

  return {
    address: {
      city,
      country: clinicProfileCountry,
      houseNumber: input.address.houseNumber,
      street: input.address.street,
      zipCode: input.address.zipCode,
    },
    descriptionText: input.descriptionText,
    name: input.name,
    openingHours: input.openingHours,
    supportedLanguages: [...input.supportedLanguages],
  }
}

function hasValidOpeningHours(openingHours: ClinicProfileOpeningHours | undefined) {
  if (!openingHours) return true

  return clinicProfileWeekdayValues.every((weekday) => {
    const day = openingHours[weekday]
    if (day.isClosed) return day.opensAt === "" && day.closesAt === ""
    return day.opensAt !== "" && day.closesAt !== "" && day.closesAt > day.opensAt
  })
}

function isPublishable(profile: ClinicProfileSourceFields) {
  return (
    profile.name.trim().length > 0 &&
    profile.descriptionText.trim().length > 0 &&
    profile.address.street.trim().length > 0 &&
    profile.address.houseNumber.trim().length > 0 &&
    profile.address.zipCode.trim().length > 0 &&
    profile.address.city !== undefined &&
    profile.supportedLanguages.length > 0 &&
    hasValidOpeningHours(profile.openingHours)
  )
}

export function resetControlledClinicProfileProvider() {
  const state = controlledState()
  state.publishedProfile = initialPublishedProfile
  state.persistentDraft = undefined
}

export function createControlledClinicProfileProvider(): ClinicProfileProvider {
  return {
    async discardDraft(input) {
      const state = controlledState()
      if (!state.persistentDraft) return { error: "not-found", ok: false }
      if (state.persistentDraft.revision !== input.expectedDraftRevision) {
        return { error: "conflict", ok: false }
      }

      state.persistentDraft = undefined
      return { ok: true, value: currentSnapshot() }
    },
    async loadSnapshot() {
      return { ok: true, value: currentSnapshot() }
    },
    async publishDraft(input) {
      const state = controlledState()
      if (!state.persistentDraft) return { error: "not-found", ok: false }
      if (
        state.publishedProfile.revision !== input.expectedPublishedRevision ||
        state.persistentDraft.basePublishedRevision !== input.expectedPublishedRevision ||
        state.persistentDraft.revision !== input.expectedDraftRevision
      ) {
        return { error: "conflict", ok: false }
      }
      if (!isPublishable(state.persistentDraft)) return { error: "invalid-input", ok: false }

      const {
        basePublishedRevision: _baseRevision,
        revision: _draftRevision,
        ...publishedFields
      } = state.persistentDraft
      state.publishedProfile = {
        ...publishedFields,
        revision: state.publishedProfile.revision + 1,
      }
      state.persistentDraft = undefined
      return { ok: true, value: currentSnapshot() }
    },
    async saveDraft(input) {
      const state = controlledState()
      if (
        state.publishedProfile.revision !== input.expectedPublishedRevision ||
        (state.persistentDraft?.revision ?? null) !== input.expectedDraftRevision
      ) {
        return { error: "conflict", ok: false }
      }

      const fields = fieldsFromDraftInput(input.draft)
      if (!fields) return { error: "invalid-input", ok: false }

      state.persistentDraft = {
        ...fields,
        basePublishedRevision: input.expectedPublishedRevision,
        revision: (state.persistentDraft?.revision ?? 0) + 1,
      }
      return { ok: true, value: currentSnapshot() }
    },
  }
}
