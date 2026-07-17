import type { ClinicDashboardSection } from "./model/workspace"

export type ClinicDashboardNavigationItem = Readonly<{
  id: ClinicDashboardSection
  label: string
}>

export const clinicDashboardNavigationItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "messages", label: "Messages" },
  { id: "reviews", label: "Reviews" },
  { id: "profile", label: "Clinic profile" },
] as const satisfies readonly ClinicDashboardNavigationItem[]
