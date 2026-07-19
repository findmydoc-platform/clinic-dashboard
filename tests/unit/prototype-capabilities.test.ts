import { describe, expect, it } from "vitest"
import { getClinicDashboardCapabilities } from "@/features/clinic-dashboard/prototype/public"
import {
  deriveClinicDashboardCapabilities,
  type ClinicDashboardCapabilities,
  type ClinicDashboardCapabilityVisibility,
} from "@/features/clinic-dashboard/prototype/prototype-capabilities"

const hiddenCapabilityVisibility = {
  certificateTasks: "hidden",
  certificatesAccreditationsPlaceholder: "hidden",
  dashboardReporting: "hidden",
  inquiryProfile: "hidden",
  locationSwitching: "hidden",
  messaging: "hidden",
  notifications: "hidden",
  profileWrites: "hidden",
  reviewManagement: "hidden",
  support: "hidden",
  subscriptionsPlaceholder: "hidden",
  teamWrites: "hidden",
} as const satisfies ClinicDashboardCapabilityVisibility

const hiddenCapabilities = {
  canManageReviews: false,
  canUseDashboardReporting: false,
  canUseMessaging: false,
  canViewDetailedPatientInquiry: false,
  canSwitchLocations: false,
  profileManagement: "hidden",
  showCertificateTasks: false,
  showCertificatesAccreditationsPlaceholder: false,
  showNotifications: false,
  showSupport: false,
  showSubscriptionsPlaceholder: false,
  teamManagement: "hidden",
} as const satisfies ClinicDashboardCapabilities

describe("clinic dashboard prototype capabilities", () => {
  it("keeps presentation mode limited to implemented read-only surfaces", () => {
    expect(getClinicDashboardCapabilities("presentation")).toEqual({
      canManageReviews: false,
      canUseDashboardReporting: false,
      canUseMessaging: false,
      canViewDetailedPatientInquiry: false,
      canSwitchLocations: false,
      profileManagement: "read-only",
      showCertificateTasks: false,
      showCertificatesAccreditationsPlaceholder: false,
      showNotifications: false,
      showSupport: false,
      showSubscriptionsPlaceholder: false,
      teamManagement: "read-only",
    })
  })

  it("enables the complete visual reference in full-interface mode", () => {
    expect(getClinicDashboardCapabilities("visual-reference")).toEqual({
      canManageReviews: true,
      canUseDashboardReporting: true,
      canUseMessaging: true,
      canViewDetailedPatientInquiry: true,
      canSwitchLocations: true,
      profileManagement: "interactive",
      showCertificateTasks: true,
      showCertificatesAccreditationsPlaceholder: true,
      showNotifications: true,
      showSupport: true,
      showSubscriptionsPlaceholder: true,
      teamManagement: "interactive",
    })
  })

  it("keeps review management without a raw export capability", () => {
    const capabilities = getClinicDashboardCapabilities("visual-reference")

    expect(capabilities.canManageReviews).toBe(true)
    expect(capabilities).not.toHaveProperty("canExportReviews")
  })

  it.each([
    ["certificateTasks", "showCertificateTasks"],
    ["locationSwitching", "canSwitchLocations"],
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

  it.each(["dashboardReporting", "locationSwitching", "messaging", "reviewManagement"] as const)(
    "keeps read-only %s visible without enabling an interactive capability",
    (visibilityField) => {
      const capabilities = deriveClinicDashboardCapabilities({
        ...hiddenCapabilityVisibility,
        [visibilityField]: "read-only",
      })

      expect(capabilities).toEqual(hiddenCapabilities)
    },
  )

  it.each([
    ["certificateTasks", "showCertificateTasks"],
    ["notifications", "showNotifications"],
    ["support", "showSupport"],
  ] as const)("does not treat read-only %s as active %s", (visibilityField, capabilityField) => {
    const capabilities = deriveClinicDashboardCapabilities({
      ...hiddenCapabilityVisibility,
      [visibilityField]: "read-only",
    })

    expect(capabilities[capabilityField]).toBe(false)
  })

  it.each([
    ["subscriptionsPlaceholder", "showSubscriptionsPlaceholder"],
    ["certificatesAccreditationsPlaceholder", "showCertificatesAccreditationsPlaceholder"],
  ] as const)("keeps the read-only %s visible as %s", (visibilityField, capabilityField) => {
    const capabilities = deriveClinicDashboardCapabilities({
      ...hiddenCapabilityVisibility,
      [visibilityField]: "read-only",
    })

    expect(capabilities).toEqual({
      ...hiddenCapabilities,
      [capabilityField]: true,
    })
  })

  it("keeps the Certificates and accreditations placeholder independent from certificate tasks", () => {
    expect(
      deriveClinicDashboardCapabilities({
        ...hiddenCapabilityVisibility,
        certificateTasks: "interactive",
      }),
    ).toEqual({
      ...hiddenCapabilities,
      showCertificateTasks: true,
    })
    expect(
      deriveClinicDashboardCapabilities({
        ...hiddenCapabilityVisibility,
        certificatesAccreditationsPlaceholder: "read-only",
      }),
    ).toEqual({
      ...hiddenCapabilities,
      showCertificatesAccreditationsPlaceholder: true,
    })
  })

  it("preserves profile and team access as mutually exclusive states", () => {
    const capabilities = deriveClinicDashboardCapabilities({
      ...hiddenCapabilityVisibility,
      profileWrites: "read-only",
      teamWrites: "interactive",
    })

    expect(capabilities.profileManagement).toBe("read-only")
    expect(capabilities.teamManagement).toBe("interactive")
  })
})
