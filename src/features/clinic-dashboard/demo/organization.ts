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
  { id: "master-laser-teeth-whitening", name: "Laser teeth whitening" },
  { id: "master-ceramic-veneers", name: "Ceramic veneers (per tooth)" },
  { id: "master-skin-analysis", name: "Skin analysis and treatment" },
  { id: "master-hair-transplant", name: "Hair transplant" },
  { id: "master-dermatology-consultation", name: "Dermatology consultation" },
] satisfies readonly MasterTreatment[]
