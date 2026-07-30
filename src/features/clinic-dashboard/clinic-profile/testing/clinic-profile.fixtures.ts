import consultationImage from "@/assets/clinic-dashboard/consultation.jpg"
import corridorImage from "@/assets/clinic-dashboard/corridor.jpg"
import exteriorImage from "@/assets/clinic-dashboard/exterior.jpg"
import markusWeberAvatar from "@/assets/clinic-dashboard/markus-weber.jpg"
import receptionImage from "@/assets/clinic-dashboard/reception.jpg"
import sarahSchmidtAvatar from "@/assets/clinic-dashboard/sarah-schmidt.jpg"
import type { ClinicProfileCommands } from "../model/clinic-profile-commands"
import type { ClinicTreatmentCommands } from "../model/clinic-treatment-commands"
import type { ClinicTreatmentsSnapshot, MasterTreatment } from "../model/clinic-treatment"
import type { ClinicProfileDraft } from "../model/clinic-profile"

const fixtureTimestamp = "2023-10-16T12:00:00.000Z"

const clinicTreatmentCatalogueFixture = [
  {
    descriptionText: "Professional whitening using a centrally maintained treatment protocol.",
    id: "master-laser-teeth-whitening",
    name: "Laser teeth whitening",
  },
  {
    descriptionText: "Ceramic veneer treatment planned for one tooth.",
    id: "master-ceramic-veneers",
    name: "Ceramic veneers (per tooth)",
  },
  {
    descriptionText: "Clinical skin analysis followed by a central treatment recommendation.",
    id: "master-skin-analysis",
    name: "Skin analysis and treatment",
  },
  {
    descriptionText: "Hair restoration treatment using a centrally maintained description.",
    id: "master-hair-transplant",
    name: "Hair transplant",
  },
] satisfies readonly MasterTreatment[]

export const clinicTreatmentSnapshotFixture = {
  catalogue: clinicTreatmentCatalogueFixture,
  offerings: [
    {
      active: true,
      id: "offering-laser-teeth-whitening",
      price: 250,
      treatment: clinicTreatmentCatalogueFixture[0],
    },
    {
      active: true,
      id: "offering-ceramic-veneers",
      price: 850,
      treatment: clinicTreatmentCatalogueFixture[1],
    },
    {
      active: false,
      id: "offering-skin-analysis",
      price: 0,
      treatment: clinicTreatmentCatalogueFixture[2],
    },
  ],
  status: "ready",
} as const

export const clinicProfileFixture = {
  address: {
    city: "Berlin",
    phone: "+49 30 12345678",
    postalCode: "10719",
    street: "Kurfürstendamm 212",
  },
  description:
    "Berlin Health Clinic is a specialist centre for aesthetic dentistry and dermatology. The clinic combines modern treatment methods with an international patient service.",
  gallery: [
    {
      alt: "Berlin Health Clinic reception",
      id: "gallery-reception",
      isCover: true,
      src: receptionImage,
    },
    {
      alt: "Berlin Health Clinic exterior",
      id: "gallery-exterior",
      isCover: false,
      src: exteriorImage,
    },
    {
      alt: "Patient consultation at Berlin Health Clinic",
      id: "gallery-consultation",
      isCover: false,
      src: consultationImage,
    },
    {
      alt: "Berlin Health Clinic corridor",
      id: "gallery-corridor",
      isCover: false,
      src: corridorImage,
    },
  ],
  galleryTotal: 16,
  id: "clinic-berlin-health",
  name: "Berlin Health Dental & Derm Clinic",
  openingHours: [
    { days: "Mon – Fri", hours: "08:00 – 20:00" },
    { days: "Sat", hours: "09:00 – 14:00" },
    { days: "Sun", hours: "Closed" },
  ],
  specialties: ["Dentistry", "Dermatology"],
  team: [
    {
      avatar: markusWeberAvatar,
      biography: "Orthodontics specialist with a focus on patient-friendly treatment planning.",
      id: "team-markus-weber",
      initials: "MW",
      name: "Dr Markus Weber",
      specialty: "Orthodontics specialist",
    },
    {
      avatar: sarahSchmidtAvatar,
      biography: "Dermatologist specialising in laser treatments and international patient care.",
      id: "team-sarah-schmidt",
      initials: "SS",
      name: "Dr Sarah Schmidt",
      specialty: "Dermatologist and laser specialist",
    },
  ],
  revision: 1,
  updatedAt: "2023-10-12T08:00:00.000Z",
} satisfies ClinicProfileDraft

export function createClinicProfileCommandsFixture(latencyMs = 0): ClinicProfileCommands {
  let teamEntitySequence = 0

  return {
    createClinicProfileEntityId: () => {
      teamEntitySequence += 1
      return `team-fixture-${teamEntitySequence}`
    },
    saveClinicProfile: async (profile) => {
      if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs))

      return {
        ...profile,
        revision: profile.revision + 1,
        updatedAt: fixtureTimestamp,
      }
    },
  }
}

export function createClinicTreatmentCommandsFixture(latencyMs = 0): ClinicTreatmentCommands {
  let snapshot: ClinicTreatmentsSnapshot = clinicTreatmentSnapshotFixture
  const wait = async () => {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs))
  }

  return {
    async createTreatment(input) {
      await wait()
      if (snapshot.status !== "ready") throw new Error("Treatment fixture is unavailable")
      const treatment = snapshot.catalogue.find((candidate) => candidate.id === input.treatmentId)
      if (!treatment) throw new Error("Unknown treatment")
      const offering = {
        active: input.active,
        id: `offering-${input.treatmentId}`,
        price: input.price,
        treatment,
      }
      snapshot = { ...snapshot, offerings: [...snapshot.offerings, offering] }
      return offering
    },
    async loadTreatments() {
      await wait()
      return snapshot
    },
    async updateTreatment(offeringId, input) {
      await wait()
      if (snapshot.status !== "ready") throw new Error("Treatment fixture is unavailable")
      const offering = snapshot.offerings.find((candidate) => candidate.id === offeringId)
      if (!offering) throw new Error("Unknown offering")
      const updated = { ...offering, ...input }
      snapshot = {
        ...snapshot,
        offerings: snapshot.offerings.map((candidate) => (candidate.id === offeringId ? updated : candidate)),
      }
      return updated
    },
  }
}
