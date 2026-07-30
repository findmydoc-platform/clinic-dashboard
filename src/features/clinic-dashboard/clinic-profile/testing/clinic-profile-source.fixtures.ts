import {
  clinicProfileCountry,
  cloneClinicProfileSourceSnapshot,
  type ClinicProfileDraftInput,
  type ClinicProfileSnapshot,
  type ClinicProfileSourceFields,
} from "../model/clinic-profile-source"
import {
  ClinicProfileSourceCommandError,
  type ClinicProfileSourceCommands,
} from "../model/clinic-profile-source-commands"

export const clinicProfileSourceFixture = {
  availableCities: [
    { id: "city-istanbul", name: "Istanbul" },
    { id: "city-ankara", name: "Ankara" },
    { id: "city-izmir", name: "Izmir" },
  ],
  published: {
    address: {
      city: { id: "city-istanbul", name: "Istanbul" },
      country: clinicProfileCountry,
      houseNumber: "195",
      street: "Büyükdere Avenue",
      zipCode: "34394",
    },
    descriptionText:
      "Medicana International Istanbul is a leading private hospital offering comprehensive healthcare services with advanced medical technology and an experienced medical team.",
    name: "Medicana International Istanbul",
    openingHours: {
      friday: { closesAt: "18:00", isClosed: false, opensAt: "09:00" },
      monday: { closesAt: "18:00", isClosed: false, opensAt: "09:00" },
      saturday: { closesAt: "13:00", isClosed: false, opensAt: "09:00" },
      sunday: { closesAt: "", isClosed: true, opensAt: "" },
      thursday: { closesAt: "18:00", isClosed: false, opensAt: "09:00" },
      tuesday: { closesAt: "18:00", isClosed: false, opensAt: "09:00" },
      wednesday: { closesAt: "18:00", isClosed: false, opensAt: "09:00" },
    },
    revision: 4,
    supportedLanguages: ["english", "turkish"],
  },
} satisfies ClinicProfileSnapshot

export const clinicProfileSourceDraftFixture = {
  ...clinicProfileSourceFixture,
  draft: {
    ...clinicProfileSourceFixture.published,
    address: {
      ...clinicProfileSourceFixture.published.address,
      houseNumber: "199",
    },
    basePublishedRevision: clinicProfileSourceFixture.published.revision,
    descriptionText:
      "Medicana International Istanbul is a leading private hospital offering comprehensive healthcare services with advanced medical technologies and an experienced medical team.",
    openingHours: {
      ...clinicProfileSourceFixture.published.openingHours,
      saturday: { closesAt: "14:00", isClosed: false, opensAt: "09:00" },
    },
    revision: 2,
    supportedLanguages: ["english", "turkish", "german"],
  },
} satisfies ClinicProfileSnapshot

function fieldsFromInput(input: ClinicProfileDraftInput, snapshot: ClinicProfileSnapshot) {
  const city = snapshot.availableCities.find((option) => option.id === input.address.cityId)
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
    supportedLanguages: input.supportedLanguages,
  } satisfies ClinicProfileSourceFields
}

export function createClinicProfileSourceCommandsFixture(
  initialSnapshot: ClinicProfileSnapshot = clinicProfileSourceFixture,
  latencyMs = 0,
): ClinicProfileSourceCommands {
  let snapshot = cloneClinicProfileSourceSnapshot(initialSnapshot)
  const wait = () =>
    latencyMs > 0 ? new Promise((resolve) => setTimeout(resolve, latencyMs)) : Promise.resolve()

  return {
    async discardDraft(input) {
      await wait()
      if (!snapshot.draft || snapshot.draft.revision !== input.expectedDraftRevision) {
        throw new ClinicProfileSourceCommandError("conflict", "Draft revision changed.")
      }
      snapshot = { ...snapshot, draft: undefined }
      return cloneClinicProfileSourceSnapshot(snapshot)
    },
    async loadSnapshot() {
      await wait()
      return cloneClinicProfileSourceSnapshot(snapshot)
    },
    async publishDraft(input) {
      await wait()
      if (
        !snapshot.draft ||
        snapshot.draft.revision !== input.expectedDraftRevision ||
        snapshot.published.revision !== input.expectedPublishedRevision
      ) {
        throw new ClinicProfileSourceCommandError("conflict", "Profile revision changed.")
      }
      const { basePublishedRevision: _, revision: __, ...fields } = snapshot.draft
      snapshot = {
        ...snapshot,
        draft: undefined,
        published: { ...fields, revision: snapshot.published.revision + 1 },
      }
      return cloneClinicProfileSourceSnapshot(snapshot)
    },
    async saveDraft(input) {
      await wait()
      if (
        snapshot.published.revision !== input.expectedPublishedRevision ||
        (snapshot.draft?.revision ?? null) !== input.expectedDraftRevision
      ) {
        throw new ClinicProfileSourceCommandError("conflict", "Profile revision changed.")
      }
      snapshot = {
        ...snapshot,
        draft: {
          ...fieldsFromInput(input.draft, snapshot),
          basePublishedRevision: snapshot.published.revision,
          revision: (snapshot.draft?.revision ?? 0) + 1,
        },
      }
      return cloneClinicProfileSourceSnapshot(snapshot)
    },
  }
}
