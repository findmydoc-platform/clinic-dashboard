import { createDashboardReportingSnapshot, type DashboardReportingSnapshots } from "../model/reporting"
import type { DashboardViewModel } from "../model/dashboard-view-model"
import type { DashboardProfileTask } from "../model/profile-tasks"

export const dashboardProfileTasks = [
  {
    actionLabel: "Review images",
    description: "The public gallery does not yet cover every clinic area expected for a complete profile.",
    destination: "gallery",
    destinationLabel: "Open image gallery",
    id: "missing-images",
    label: "Missing images",
    priority: "High",
    visibility: "always",
  },
  {
    actionLabel: "Review team",
    description: "Two doctor profiles still need review before the public team section is complete.",
    destination: "team",
    destinationLabel: "Open doctors and team",
    id: "open-doctor-profiles",
    label: "Open doctor profiles",
    priority: "Medium",
    visibility: "always",
  },
  {
    actionLabel: "View details",
    description: "Required certificates have not yet been added to the clinic profile.",
    id: "certificates-required",
    label: "Certificates required",
    priority: "High",
    visibility: "full-interface",
  },
] as const satisfies readonly DashboardProfileTask[]

const dashboardFixtureProfileTasks: readonly DashboardProfileTask[] = [
  ...dashboardProfileTasks,
  {
    actionLabel: "View details",
    description: "One certificate is approaching its expiry date and needs review.",
    id: "certificate-expiry",
    label: "Certificate expiry",
    priority: "Low",
    visibility: "full-interface",
  },
]

const reporting = createDashboardReportingSnapshot({
  changes: {
    contacts: "-7.7%",
    impressions: "+8.4%",
    inquiries: "+25.0%",
    profileViews: "+10.1%",
  },
  chart: {
    comparison: "+10.1% vs. previous 7 days",
    description:
      "Daily profile views across the selected 7 days total 848. The highest day has 135 profile views.",
    points: [
      { axisLabel: "Oct 6", dateLabel: "October 6", value: 103 },
      { axisLabel: "Oct 7", dateLabel: "October 7", value: 111 },
      { axisLabel: "Oct 8", dateLabel: "October 8", value: 119 },
      { axisLabel: "Oct 9", dateLabel: "October 9", value: 117 },
      { axisLabel: "Oct 10", dateLabel: "October 10", value: 129 },
      { axisLabel: "Oct 11", dateLabel: "October 11", value: 135 },
      { axisLabel: "Oct 12", dateLabel: "October 12", value: 134 },
    ],
  },
  period: "7 days",
  reviewActivity: "1 new review in the last 7 days",
  totals: {
    contacts: 12,
    impressions: 4_680,
    inquiries: 5,
    profileViews: 848,
    uniqueVisitors: 543,
  },
})

const reportingSnapshots = {
  "7 days": reporting,
  "30 days": createDashboardReportingSnapshot({
    changes: {
      contacts: "-2.1%",
      impressions: "+5.2%",
      inquiries: "+8.4%",
      profileViews: "+12.0%",
    },
    chart: {
      comparison: "+12.0% vs. previous 30 days",
      description: "Profile views across the selected 30 days total 3,284.",
      points: [{ dateLabel: "30-day total", value: 3_284 }],
    },
    period: "30 days",
    reviewActivity: "5 new reviews in the last 30 days",
    totals: {
      contacts: 42,
      impressions: 18_420,
      inquiries: 16,
      profileViews: 3_284,
      uniqueVisitors: 2_105,
    },
  }),
  "90 days": createDashboardReportingSnapshot({
    changes: {
      contacts: "+4.4%",
      impressions: "+11.8%",
      inquiries: "+6.7%",
      profileViews: "+9.6%",
    },
    chart: {
      comparison: "+9.6% vs. previous 90 days",
      description: "Profile views across the selected 90 days total 9,410.",
      points: [{ dateLabel: "90-day total", value: 9_410 }],
    },
    period: "90 days",
    reviewActivity: "17 new reviews in the last 90 days",
    totals: {
      contacts: 118,
      impressions: 53_680,
      inquiries: 45,
      profileViews: 9_410,
      uniqueVisitors: 6_006,
    },
  }),
} satisfies DashboardReportingSnapshots

export const dashboardFixture = {
  profileTasks: dashboardFixtureProfileTasks,
  rating: {
    categories: ["Hair transplant", "Dental implants", "Laser eye surgery"],
    count: 1_248,
    pendingResponses: 1,
    value: 4.8,
  },
  reporting: reportingSnapshots,
} satisfies Readonly<{
  profileTasks: readonly DashboardProfileTask[]
  rating: DashboardViewModel["rating"]
  reporting: DashboardReportingSnapshots
}>

export const dashboardViewModel = {
  clinicPreview: {
    location: "Mitte, Berlin",
    name: "Berlin Health Clinic — Mitte",
    ratingLabel: "4.8 ★",
  },
  profileCompletion: "82%",
  profileTasks: dashboardProfileTasks,
  rating: {
    categories: ["Hair transplant", "Dental implants", "Laser eye surgery"],
    count: 1_248,
    pendingResponses: 1,
    value: 4.8,
  },
  reporting: reportingSnapshots["7 days"],
} satisfies DashboardViewModel
