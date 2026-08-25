import type { ClinicDashboardSection } from "./model/workspace"

export type ClinicDashboardNavigationItem = Readonly<{
  id: ClinicDashboardSection
  label: string
}>

export const clinicDashboardNavigationItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "messages", label: "Inquiries" },
  { id: "reviews", label: "Reviews" },
  { id: "profile", label: "Clinic profile" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "certificates-accreditations", label: "Credentials" },
] as const satisfies readonly ClinicDashboardNavigationItem[]

type ClinicDashboardNavigationVisibility = Readonly<{
  showCertificatesAccreditationsPlaceholder: boolean
  showSubscriptionsPlaceholder: boolean
}>

export function selectClinicDashboardNavigationItems({
  showCertificatesAccreditationsPlaceholder,
  showSubscriptionsPlaceholder,
}: ClinicDashboardNavigationVisibility) {
  return clinicDashboardNavigationItems.filter(
    ({ id }) =>
      (id !== "subscriptions" || showSubscriptionsPlaceholder) &&
      (id !== "certificates-accreditations" || showCertificatesAccreditationsPlaceholder),
  )
}

export function selectSafeClinicDashboardSection(
  section: ClinicDashboardSection,
  items: readonly ClinicDashboardNavigationItem[],
): ClinicDashboardSection {
  return items.some(({ id }) => id === section) ? section : "dashboard"
}
