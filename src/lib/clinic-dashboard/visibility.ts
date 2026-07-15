const clinicDashboardVariants = ["visual-reference", "presentation"] as const

export type ClinicDashboardVariant = (typeof clinicDashboardVariants)[number]

export type ClinicDashboardSection = "dashboard" | "messages" | "profile" | "reviews"

export type ClinicDashboardDialog = "patient-profile" | "team-member" | "treatment"

export type VisibilityBehavior = "hidden" | "interactive" | "read-only"

export type ClinicDashboardGate = Readonly<{
  area: string
  issue: `https://github.com/findmydoc-platform/website/issues/${number}`
  presentation: VisibilityBehavior
  visualReference: VisibilityBehavior
}>

const websiteIssue = <Issue extends number>(issue: Issue) =>
  `https://github.com/findmydoc-platform/website/issues/${issue}` as const

const clinicDashboardVisibility = {
  dashboardReporting: {
    area: "Dashboard reporting periods and actions",
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
  laterScope: {
    area: "Notifications, support, certificates, templates, exports, and appointments",
    issue: websiteIssue(1523),
    presentation: "hidden",
    visualReference: "interactive",
  },
  messaging: {
    area: "Conversation selection, composer, attachments, notes, and sending",
    issue: websiteIssue(1530),
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
  teamWrites: {
    area: "Public non-doctor team creation",
    issue: websiteIssue(1527),
    presentation: "read-only",
    visualReference: "interactive",
  },
} as const satisfies Record<string, ClinicDashboardGate>

export type ClinicDashboardGateId = keyof typeof clinicDashboardVisibility

export function isClinicDashboardVariant(value: string): value is ClinicDashboardVariant {
  return clinicDashboardVariants.includes(value as ClinicDashboardVariant)
}

export function getGateIssue(gate: ClinicDashboardGateId) {
  return clinicDashboardVisibility[gate].issue
}

export function getVisibilityBehavior(variant: ClinicDashboardVariant, gate: ClinicDashboardGateId) {
  const configuration = clinicDashboardVisibility[gate]

  return variant === "presentation" ? configuration.presentation : configuration.visualReference
}

export function isGateVisible(variant: ClinicDashboardVariant, gate: ClinicDashboardGateId) {
  return getVisibilityBehavior(variant, gate) !== "hidden"
}
