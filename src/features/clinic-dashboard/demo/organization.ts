import sarahSchmidtAvatar from "./assets/people/sarah-schmidt.jpg"
import type { MasterTreatment } from "@/features/clinic-dashboard/clinic-profile/public"
import type { ClinicDashboardLocation } from "../workspace/public"

export const clinicDashboardDemoAccount = {
  avatar: sarahSchmidtAvatar,
  initials: "SS",
  name: "Sarah Schmidt",
  role: "Clinic administrator",
} as const

export const clinicDashboardDemoOrganization = {
  id: "berlin-health-group",
  name: "Berlin Health Group",
} as const

export const clinicDashboardDemoLocations = [
  {
    id: "berlin-mitte",
    location: "Mitte, Berlin",
    name: "Berlin Health Clinic — Mitte",
    selectorLabel: "Mitte",
  },
  {
    id: "berlin-charlottenburg",
    location: "Charlottenburg, Berlin",
    name: "Berlin Health Clinic — Charlottenburg",
    selectorLabel: "Charlottenburg",
  },
  {
    id: "potsdam",
    location: "Potsdam, Brandenburg",
    name: "Berlin Health Clinic — Potsdam",
    selectorLabel: "Potsdam",
  },
] satisfies readonly ClinicDashboardLocation[]

export const clinicDashboardDemoDefaultLocationId = "berlin-mitte"

export const clinicDashboardDemoTreatmentCatalogue = [
  { id: "master-laser-teeth-whitening", name: "Laser teeth whitening" },
  { id: "master-ceramic-veneers", name: "Ceramic veneers (per tooth)" },
  { id: "master-skin-analysis", name: "Skin analysis and treatment" },
  { id: "master-hair-transplant", name: "Hair transplant" },
  { id: "master-dermatology-consultation", name: "Dermatology consultation" },
] satisfies readonly MasterTreatment[]
