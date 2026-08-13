import personCAvatar from "./assets/people/person-c.jpg"
import type { MasterTreatment } from "@/features/clinic-dashboard/clinic-profile/public"
import type { ClinicDashboardLocation } from "../workspace/public"

export const clinicDashboardDemoAccount = {
  avatar: personCAvatar,
  initials: "SE",
  name: "Selin Erdem",
  role: "Clinic administrator",
} as const

export const clinicDashboardDemoOrganization = {
  id: "avenora-health-group",
  name: "Avenora Health Group",
} as const

export const clinicDashboardDemoLocations = [
  {
    id: "istanbul-levent",
    location: "Levent, İstanbul",
    name: "Avenora Clinic — İstanbul",
    selectorLabel: "İstanbul",
  },
  {
    id: "izmir-alsancak",
    location: "Alsancak, İzmir",
    name: "Avenora Clinic — İzmir",
    selectorLabel: "İzmir",
  },
  {
    id: "antalya-lara",
    location: "Lara, Antalya",
    name: "Avenora Clinic — Antalya",
    selectorLabel: "Antalya",
  },
] satisfies readonly ClinicDashboardLocation[]

export const clinicDashboardDemoDefaultLocationId = "istanbul-levent"

export const clinicDashboardDemoTreatmentCatalogue = [
  {
    descriptionText: "Professional tooth whitening using a centrally maintained treatment protocol.",
    id: "master-laser-teeth-whitening",
    name: "Laser teeth whitening",
  },
  {
    descriptionText: "Ceramic veneer treatment planned and priced per tooth.",
    id: "master-ceramic-veneers",
    name: "Ceramic veneers (per tooth)",
  },
  {
    descriptionText: "Clinical skin analysis followed by a central treatment recommendation.",
    id: "master-skin-analysis",
    name: "Skin analysis and treatment",
  },
  {
    descriptionText: "Hair restoration treatment using a centrally maintained procedure description.",
    id: "master-hair-transplant",
    name: "Hair transplant",
  },
  {
    descriptionText: "Consultation with a dermatologist to assess symptoms and treatment options.",
    id: "master-dermatology-consultation",
    name: "Dermatology consultation",
  },
] satisfies readonly MasterTreatment[]
