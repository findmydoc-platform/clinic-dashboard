import type { ClinicDashboardPrototypeMode } from "./prototype-mode"

export type VisibilityBehavior = "hidden" | "interactive" | "read-only"

type ClinicDashboardGate = Readonly<{
  area: string
  issue: `https://github.com/findmydoc-platform/website/issues/${number}`
  presentation: VisibilityBehavior
  visualReference: VisibilityBehavior
}>

const websiteIssue = <Issue extends number>(issue: Issue) =>
  `https://github.com/findmydoc-platform/website/issues/${issue}` as const

const clinicDashboardVisibilityPolicy = {
  certificateTasks: {
    area: "Certificate task details",
    issue: websiteIssue(1523),
    presentation: "hidden",
    visualReference: "interactive",
  },
  certificatesAccreditationsPlaceholder: {
    area: "Certificates and accreditations placeholder",
    issue: websiteIssue(1523),
    presentation: "hidden",
    visualReference: "read-only",
  },
  dashboardReporting: {
    area: "Dashboard reporting periods and profile-view export",
    issue: websiteIssue(1531),
    presentation: "hidden",
    visualReference: "interactive",
  },
  inquiryProfile: {
    area: "Patient inquiry profile details",
    issue: websiteIssue(1526),
    presentation: "read-only",
    visualReference: "interactive",
  },
  messaging: {
    area: "Conversation selection, composer, reply templates, attachments, notes, and sending",
    issue: websiteIssue(1530),
    presentation: "hidden",
    visualReference: "interactive",
  },
  notifications: {
    area: "Notification center and local read state",
    issue: websiteIssue(1523),
    presentation: "hidden",
    visualReference: "interactive",
  },
  profileWrites: {
    area: "Clinic profile and treatment writes",
    issue: websiteIssue(1528),
    presentation: "read-only",
    visualReference: "interactive",
  },
  reviewManagement: {
    area: "Review filtering, responses, appeals, notes, and pagination",
    issue: websiteIssue(1529),
    presentation: "hidden",
    visualReference: "interactive",
  },
  support: {
    area: "Support request flow",
    issue: websiteIssue(1523),
    presentation: "hidden",
    visualReference: "interactive",
  },
  subscriptionsPlaceholder: {
    area: "Subscriptions placeholder",
    issue: websiteIssue(1523),
    presentation: "hidden",
    visualReference: "read-only",
  },
  teamWrites: {
    area: "Public non-doctor team creation",
    issue: websiteIssue(1527),
    presentation: "read-only",
    visualReference: "interactive",
  },
} as const satisfies Record<string, ClinicDashboardGate>

export type ClinicDashboardGateId = keyof typeof clinicDashboardVisibilityPolicy

export function getGateIssue(gate: ClinicDashboardGateId) {
  return clinicDashboardVisibilityPolicy[gate].issue
}

export function getVisibilityBehavior(
  prototypeMode: ClinicDashboardPrototypeMode,
  gate: ClinicDashboardGateId,
) {
  const configuration = clinicDashboardVisibilityPolicy[gate]

  return prototypeMode === "presentation" ? configuration.presentation : configuration.visualReference
}

export type ClinicDashboardCapabilities = Readonly<{
  canManageReviews: boolean
  canUseDashboardReporting: boolean
  canUseMessaging: boolean
  canViewDetailedPatientInquiry: boolean
  profileManagement: VisibilityBehavior
  showCertificateTasks: boolean
  showCertificatesAccreditationsPlaceholder: boolean
  showNotifications: boolean
  showSupport: boolean
  showSubscriptionsPlaceholder: boolean
  teamManagement: VisibilityBehavior
}>

export type ClinicDashboardCapabilityVisibility = Readonly<Record<ClinicDashboardGateId, VisibilityBehavior>>

function isInteractive(behavior: VisibilityBehavior) {
  return behavior === "interactive"
}

export function deriveClinicDashboardCapabilities(
  visibility: ClinicDashboardCapabilityVisibility,
): ClinicDashboardCapabilities {
  return {
    canManageReviews: isInteractive(visibility.reviewManagement),
    canUseDashboardReporting: isInteractive(visibility.dashboardReporting),
    canUseMessaging: isInteractive(visibility.messaging),
    canViewDetailedPatientInquiry: isInteractive(visibility.inquiryProfile),
    profileManagement: visibility.profileWrites,
    showCertificateTasks: isInteractive(visibility.certificateTasks),
    showCertificatesAccreditationsPlaceholder: visibility.certificatesAccreditationsPlaceholder !== "hidden",
    showNotifications: isInteractive(visibility.notifications),
    showSupport: isInteractive(visibility.support),
    showSubscriptionsPlaceholder: visibility.subscriptionsPlaceholder !== "hidden",
    teamManagement: visibility.teamWrites,
  }
}

export function getClinicDashboardCapabilities(
  prototypeMode: ClinicDashboardPrototypeMode,
): ClinicDashboardCapabilities {
  return deriveClinicDashboardCapabilities({
    certificateTasks: getVisibilityBehavior(prototypeMode, "certificateTasks"),
    certificatesAccreditationsPlaceholder: getVisibilityBehavior(
      prototypeMode,
      "certificatesAccreditationsPlaceholder",
    ),
    dashboardReporting: getVisibilityBehavior(prototypeMode, "dashboardReporting"),
    inquiryProfile: getVisibilityBehavior(prototypeMode, "inquiryProfile"),
    messaging: getVisibilityBehavior(prototypeMode, "messaging"),
    notifications: getVisibilityBehavior(prototypeMode, "notifications"),
    profileWrites: getVisibilityBehavior(prototypeMode, "profileWrites"),
    reviewManagement: getVisibilityBehavior(prototypeMode, "reviewManagement"),
    support: getVisibilityBehavior(prototypeMode, "support"),
    subscriptionsPlaceholder: getVisibilityBehavior(prototypeMode, "subscriptionsPlaceholder"),
    teamWrites: getVisibilityBehavior(prototypeMode, "teamWrites"),
  })
}
