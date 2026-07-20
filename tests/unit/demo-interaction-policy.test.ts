import { describe, expect, it } from "vitest"
import { getClinicDashboardDemoInteractionPolicy } from "@/features/clinic-dashboard/prototype/public"
import {
  deriveClinicDashboardDemoInteractionPolicy,
  type ClinicDashboardDemoInteractionPolicy,
  type ClinicDashboardDemoPolicyVisibility,
} from "@/features/clinic-dashboard/prototype/demo-interaction-policy"

const hiddenVisibility = {
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
} as const satisfies ClinicDashboardDemoPolicyVisibility

const hiddenPolicy = {
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
} as const satisfies ClinicDashboardDemoInteractionPolicy

describe("clinic dashboard demo interaction policy", () => {
  it("makes presentation mode the polished interactive clinic demo", () => {
    expect(getClinicDashboardDemoInteractionPolicy("presentation")).toEqual({
      canManageReviews: true,
      canUseDashboardReporting: true,
      canUseMessaging: true,
      canViewDetailedPatientInquiry: true,
      canSwitchLocations: true,
      profileManagement: "interactive",
      showCertificateTasks: false,
      showCertificatesAccreditationsPlaceholder: true,
      showNotifications: true,
      showSupport: true,
      showSubscriptionsPlaceholder: true,
      teamManagement: "interactive",
    })
  })

  it("keeps internal visual-reference additions separate", () => {
    const policy = getClinicDashboardDemoInteractionPolicy("visual-reference")
    expect(policy).toEqual({
      ...getClinicDashboardDemoInteractionPolicy("presentation"),
      showCertificateTasks: true,
    })
    expect(policy).not.toHaveProperty("canExportReviews")
  })

  it.each([
    ["certificateTasks", "showCertificateTasks"],
    ["locationSwitching", "canSwitchLocations"],
    ["notifications", "showNotifications"],
    ["support", "showSupport"],
  ] as const)("derives %s independently", (visibilityField, policyField) => {
    expect(
      deriveClinicDashboardDemoInteractionPolicy({
        ...hiddenVisibility,
        [visibilityField]: "interactive",
      }),
    ).toEqual({ ...hiddenPolicy, [policyField]: true })
  })

  it("keeps placeholders visible when their behavior is read-only", () => {
    expect(
      deriveClinicDashboardDemoInteractionPolicy({
        ...hiddenVisibility,
        subscriptionsPlaceholder: "read-only",
      }),
    ).toEqual({ ...hiddenPolicy, showSubscriptionsPlaceholder: true })
  })
})
