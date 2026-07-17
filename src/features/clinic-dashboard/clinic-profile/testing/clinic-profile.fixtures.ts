import consultationImage from "@/assets/clinic-dashboard/consultation.jpg"
import corridorImage from "@/assets/clinic-dashboard/corridor.jpg"
import exteriorImage from "@/assets/clinic-dashboard/exterior.jpg"
import markusWeberAvatar from "@/assets/clinic-dashboard/markus-weber.jpg"
import receptionImage from "@/assets/clinic-dashboard/reception.jpg"
import sarahSchmidtAvatar from "@/assets/clinic-dashboard/sarah-schmidt.jpg"
import type { ClinicProfileCommands } from "../model/clinic-profile-commands"
import type { ClinicProfileDraft } from "../model/clinic-profile"

const fixtureTimestamp = "2023-10-16T12:00:00.000Z"

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
  treatments: [
    {
      category: "Dentistry",
      description: "A clinic-based whitening treatment with consultation and aftercare guidance.",
      duration: "60 min",
      id: "treatment-whitening",
      name: "Laser teeth whitening",
      price: "€250",
    },
    {
      category: "Dentistry",
      description: "Custom ceramic veneers planned and fitted for a natural result.",
      duration: "90 min",
      id: "treatment-veneers",
      name: "Ceramic veneers (per tooth)",
      price: "€850",
    },
    {
      category: "Aesthetics",
      description: "A structured skin assessment followed by a personalised treatment recommendation.",
      duration: "45 min",
      id: "treatment-skin-analysis",
      name: "Skin analysis and treatment",
      price: "€120",
    },
  ],
  revision: 1,
  updatedAt: "2023-10-12T08:00:00.000Z",
} satisfies ClinicProfileDraft

export function createClinicProfileCommandsFixture(latencyMs = 0): ClinicProfileCommands {
  const entitySequence = { team: 0, treatment: 0 }

  return {
    createClinicProfileEntityId: (kind) => {
      entitySequence[kind] += 1
      return `${kind}-fixture-${entitySequence[kind]}`
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
