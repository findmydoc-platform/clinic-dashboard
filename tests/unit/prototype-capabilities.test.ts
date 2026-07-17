import { describe, expect, it } from "vitest"
import { getClinicDashboardCapabilities } from "@/features/clinic-dashboard/prototype/public"
import {
  deriveClinicDashboardCapabilities,
  type ClinicDashboardCapabilities,
  type ClinicDashboardCapabilityVisibility,
} from "@/features/clinic-dashboard/prototype/prototype-capabilities"

const hiddenCapabilityVisibility = {
  certificateTasks: "hidden",
  dashboardReporting: "hidden",
  inquiryProfile: "hidden",
  messaging: "hidden",
  notifications: "hidden",
  profileWrites: "hidden",
  reviewManagement: "hidden",
  support: "hidden",
  teamWrites: "hidden",
} as const satisfies ClinicDashboardCapabilityVisibility

const hiddenCapabilities = {
  canManageProfile: false,
  canManageReviews: false,
  canManageTeam: false,
  canUseDashboardReporting: false,
  canUseMessaging: false,
  canViewDetailedPatientInquiry: false,
  showCertificateTasks: false,
  showNotifications: false,
  showProfileManagement: false,
  showSupport: false,
  showTeamManagement: false,
} as const satisfies ClinicDashboardCapabilities

describe("clinic dashboard prototype capabilities", () => {
  it("keeps presentation mode limited to implemented read-only surfaces", () => {
    expect(getClinicDashboardCapabilities("presentation")).toEqual({
      canManageProfile: false,
      canManageReviews: false,
      canManageTeam: false,
      canUseDashboardReporting: false,
      canUseMessaging: false,
      canViewDetailedPatientInquiry: false,
      showCertificateTasks: false,
      showNotifications: false,
      showProfileManagement: true,
      showSupport: false,
      showTeamManagement: true,
    })
  })

  it("enables the complete visual reference in full-interface mode", () => {
    expect(getClinicDashboardCapabilities("visual-reference")).toEqual({
      canManageProfile: true,
      canManageReviews: true,
      canManageTeam: true,
      canUseDashboardReporting: true,
      canUseMessaging: true,
      canViewDetailedPatientInquiry: true,
      showCertificateTasks: true,
      showNotifications: true,
      showProfileManagement: true,
      showSupport: true,
      showTeamManagement: true,
    })
  })

  it.each([
    ["certificateTasks", "showCertificateTasks"],
    ["notifications", "showNotifications"],
    ["support", "showSupport"],
  ] as const)("derives %s independently as %s", (visibilityField, capabilityField) => {
    const capabilities = deriveClinicDashboardCapabilities({
      ...hiddenCapabilityVisibility,
      [visibilityField]: "interactive",
    })

    expect(capabilities).toEqual({
      ...hiddenCapabilities,
      [capabilityField]: true,
    })
  })
})
