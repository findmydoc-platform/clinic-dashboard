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
    area: "Review filtering, responses, appeals, notes, exports, and pagination",
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
  canManageProfile: boolean
  canManageReviews: boolean
  canManageTeam: boolean
  canUseDashboardReporting: boolean
  canUseMessaging: boolean
  canViewDetailedPatientInquiry: boolean
  showCertificateTasks: boolean
  showNotifications: boolean
  showProfileManagement: boolean
  showSupport: boolean
  showTeamManagement: boolean
}>

export type ClinicDashboardCapabilityVisibility = Readonly<Record<ClinicDashboardGateId, VisibilityBehavior>>

function isVisible(behavior: VisibilityBehavior) {
  return behavior !== "hidden"
}

export function deriveClinicDashboardCapabilities(
  visibility: ClinicDashboardCapabilityVisibility,
): ClinicDashboardCapabilities {
  return {
    canManageProfile: visibility.profileWrites === "interactive",
    canManageReviews: isVisible(visibility.reviewManagement),
    canManageTeam: visibility.teamWrites === "interactive",
    canUseDashboardReporting: isVisible(visibility.dashboardReporting),
    canUseMessaging: isVisible(visibility.messaging),
    canViewDetailedPatientInquiry: visibility.inquiryProfile === "interactive",
    showCertificateTasks: isVisible(visibility.certificateTasks),
    showNotifications: isVisible(visibility.notifications),
    showProfileManagement: isVisible(visibility.profileWrites),
    showSupport: isVisible(visibility.support),
    showTeamManagement: isVisible(visibility.teamWrites),
  }
}

export function getClinicDashboardCapabilities(
  prototypeMode: ClinicDashboardPrototypeMode,
): ClinicDashboardCapabilities {
  return deriveClinicDashboardCapabilities({
    certificateTasks: getVisibilityBehavior(prototypeMode, "certificateTasks"),
    dashboardReporting: getVisibilityBehavior(prototypeMode, "dashboardReporting"),
    inquiryProfile: getVisibilityBehavior(prototypeMode, "inquiryProfile"),
    messaging: getVisibilityBehavior(prototypeMode, "messaging"),
    notifications: getVisibilityBehavior(prototypeMode, "notifications"),
    profileWrites: getVisibilityBehavior(prototypeMode, "profileWrites"),
    reviewManagement: getVisibilityBehavior(prototypeMode, "reviewManagement"),
    support: getVisibilityBehavior(prototypeMode, "support"),
    teamWrites: getVisibilityBehavior(prototypeMode, "teamWrites"),
  })
}
