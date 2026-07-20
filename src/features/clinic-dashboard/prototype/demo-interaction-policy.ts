import type { ClinicDashboardPrototypeMode } from "./prototype-mode"

export type VisibilityBehavior = "hidden" | "interactive" | "read-only"

type ClinicDashboardDemoGate = Readonly<{
  area: string
  issue: `https://github.com/findmydoc-platform/website/issues/${number}`
  presentation: VisibilityBehavior
  visualReference: VisibilityBehavior
}>

const websiteIssue = <Issue extends number>(issue: Issue) =>
  `https://github.com/findmydoc-platform/website/issues/${issue}` as const

const clinicDashboardDemoVisibilityPolicy = {
  certificateTasks: {
    area: "Certificate task details",
    issue: websiteIssue(1523),
    presentation: "hidden",
    visualReference: "interactive",
  },
  certificatesAccreditationsPlaceholder: {
    area: "Certificates and accreditations placeholder",
    issue: websiteIssue(1523),
    presentation: "read-only",
    visualReference: "read-only",
  },
  dashboardReporting: {
    area: "Dashboard reporting periods and profile-view export",
    issue: websiteIssue(1531),
    presentation: "interactive",
    visualReference: "interactive",
  },
  inquiryProfile: {
    area: "Patient inquiry profile details",
    issue: websiteIssue(1526),
    presentation: "interactive",
    visualReference: "interactive",
  },
  locationSwitching: {
    area: "Demo clinic location switching",
    issue: websiteIssue(1523),
    presentation: "interactive",
    visualReference: "interactive",
  },
  messaging: {
    area: "Conversation selection, composer, reply templates, attachments, notes, and sending",
    issue: websiteIssue(1530),
    presentation: "interactive",
    visualReference: "interactive",
  },
  notifications: {
    area: "Notification center and local read state",
    issue: websiteIssue(1523),
    presentation: "interactive",
    visualReference: "interactive",
  },
  profileWrites: {
    area: "Clinic profile and treatment writes",
    issue: websiteIssue(1528),
    presentation: "interactive",
    visualReference: "interactive",
  },
  reviewManagement: {
    area: "Review filtering, responses, appeals, notes, and pagination",
    issue: websiteIssue(1529),
    presentation: "interactive",
    visualReference: "interactive",
  },
  support: {
    area: "Support request flow",
    issue: websiteIssue(1523),
    presentation: "interactive",
    visualReference: "interactive",
  },
  subscriptionsPlaceholder: {
    area: "Subscriptions placeholder",
    issue: websiteIssue(1523),
    presentation: "read-only",
    visualReference: "read-only",
  },
  teamWrites: {
    area: "Public team profile changes",
    issue: websiteIssue(1527),
    presentation: "interactive",
    visualReference: "interactive",
  },
} as const satisfies Record<string, ClinicDashboardDemoGate>

export type ClinicDashboardDemoGateId = keyof typeof clinicDashboardDemoVisibilityPolicy

export function getDemoGateIssue(gate: ClinicDashboardDemoGateId) {
  return clinicDashboardDemoVisibilityPolicy[gate].issue
}

export function getDemoVisibilityBehavior(
  prototypeMode: ClinicDashboardPrototypeMode,
  gate: ClinicDashboardDemoGateId,
) {
  const configuration = clinicDashboardDemoVisibilityPolicy[gate]

  return prototypeMode === "presentation" ? configuration.presentation : configuration.visualReference
}

export type ClinicDashboardDemoInteractionPolicy = Readonly<{
  canManageReviews: boolean
  canUseDashboardReporting: boolean
  canUseMessaging: boolean
  canViewDetailedPatientInquiry: boolean
  canSwitchLocations: boolean
  profileManagement: VisibilityBehavior
  showCertificateTasks: boolean
  showCertificatesAccreditationsPlaceholder: boolean
  showNotifications: boolean
  showSupport: boolean
  showSubscriptionsPlaceholder: boolean
  teamManagement: VisibilityBehavior
}>

export type ClinicDashboardDemoPolicyVisibility = Readonly<
  Record<ClinicDashboardDemoGateId, VisibilityBehavior>
>

function isInteractive(behavior: VisibilityBehavior) {
  return behavior === "interactive"
}

export function deriveClinicDashboardDemoInteractionPolicy(
  visibility: ClinicDashboardDemoPolicyVisibility,
): ClinicDashboardDemoInteractionPolicy {
  return {
    canManageReviews: isInteractive(visibility.reviewManagement),
    canUseDashboardReporting: isInteractive(visibility.dashboardReporting),
    canUseMessaging: isInteractive(visibility.messaging),
    canViewDetailedPatientInquiry: isInteractive(visibility.inquiryProfile),
    canSwitchLocations: isInteractive(visibility.locationSwitching),
    profileManagement: visibility.profileWrites,
    showCertificateTasks: isInteractive(visibility.certificateTasks),
    showCertificatesAccreditationsPlaceholder: visibility.certificatesAccreditationsPlaceholder !== "hidden",
    showNotifications: isInteractive(visibility.notifications),
    showSupport: isInteractive(visibility.support),
    showSubscriptionsPlaceholder: visibility.subscriptionsPlaceholder !== "hidden",
    teamManagement: visibility.teamWrites,
  }
}

export function getClinicDashboardDemoInteractionPolicy(
  prototypeMode: ClinicDashboardPrototypeMode,
): ClinicDashboardDemoInteractionPolicy {
  return deriveClinicDashboardDemoInteractionPolicy({
    certificateTasks: getDemoVisibilityBehavior(prototypeMode, "certificateTasks"),
    certificatesAccreditationsPlaceholder: getDemoVisibilityBehavior(
      prototypeMode,
      "certificatesAccreditationsPlaceholder",
    ),
    dashboardReporting: getDemoVisibilityBehavior(prototypeMode, "dashboardReporting"),
    inquiryProfile: getDemoVisibilityBehavior(prototypeMode, "inquiryProfile"),
    locationSwitching: getDemoVisibilityBehavior(prototypeMode, "locationSwitching"),
    messaging: getDemoVisibilityBehavior(prototypeMode, "messaging"),
    notifications: getDemoVisibilityBehavior(prototypeMode, "notifications"),
    profileWrites: getDemoVisibilityBehavior(prototypeMode, "profileWrites"),
    reviewManagement: getDemoVisibilityBehavior(prototypeMode, "reviewManagement"),
    support: getDemoVisibilityBehavior(prototypeMode, "support"),
    subscriptionsPlaceholder: getDemoVisibilityBehavior(prototypeMode, "subscriptionsPlaceholder"),
    teamWrites: getDemoVisibilityBehavior(prototypeMode, "teamWrites"),
  })
}
