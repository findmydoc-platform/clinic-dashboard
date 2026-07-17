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
  { id: "subscriptions", label: "Subscriptions" },
] as const satisfies readonly ClinicDashboardNavigationItem[]

type ClinicDashboardNavigationVisibility = Readonly<{
  showSubscriptionsPlaceholder: boolean
}>

export function selectClinicDashboardNavigationItems({
  showSubscriptionsPlaceholder,
}: ClinicDashboardNavigationVisibility) {
  return showSubscriptionsPlaceholder
    ? clinicDashboardNavigationItems
    : clinicDashboardNavigationItems.filter(({ id }) => id !== "subscriptions")
}

export function selectSafeClinicDashboardSection(
  section: ClinicDashboardSection,
  items: readonly ClinicDashboardNavigationItem[],
): ClinicDashboardSection {
  return items.some(({ id }) => id === section) ? section : "dashboard"
}
