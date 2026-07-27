import { createDashboardReportingSnapshot, type DashboardReportingSnapshots } from "../model/reporting"
import type { DashboardViewModel } from "../model/dashboard-view-model"
import type { DashboardSnapshot } from "../model/dashboard-snapshot"
import { createDashboardMetricSelection } from "../model/dashboard-metric-selection"
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
    actionLabel: "Review doctors",
    description: "Two doctor profiles still need review before their public profiles are complete.",
    destination: "doctors",
    destinationLabel: "Open doctors",
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
    views: "+10.1%",
  },
  chart: {
    cadence: "daily",
    dates: [
      { axisLabel: "Oct 6", dateLabel: "October 6" },
      { axisLabel: "Oct 7", dateLabel: "October 7" },
      { axisLabel: "Oct 8", dateLabel: "October 8" },
      { axisLabel: "Oct 9", dateLabel: "October 9" },
      { axisLabel: "Oct 10", dateLabel: "October 10" },
      { axisLabel: "Oct 11", dateLabel: "October 11" },
      { axisLabel: "Oct 12", dateLabel: "October 12" },
    ],
    series: {
      contacts: [1, 1, 2, 2, 2, 2, 2],
      impressions: [568, 613, 657, 646, 712, 745, 739],
      inquiries: [0, 0, 1, 1, 1, 1, 1],
      uniqueVisitors: [66, 71, 76, 75, 83, 86, 86],
      views: [103, 111, 119, 117, 129, 135, 134],
    },
  },
  period: "7 days",
  profileCompletion: 82,
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
      views: "+12.0%",
    },
    chart: {
      cadence: "daily",
      dates: [{ dateLabel: "30-day total" }],
      series: {
        contacts: [42],
        impressions: [18_420],
        inquiries: [16],
        uniqueVisitors: [2_105],
        views: [3_284],
      },
    },
    period: "30 days",
    profileCompletion: 82,
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
      views: "+9.6%",
    },
    chart: {
      cadence: "weekly",
      dates: [{ dateLabel: "90-day total" }],
      series: {
        contacts: [118],
        impressions: [53_680],
        inquiries: [45],
        uniqueVisitors: [6_006],
        views: [9_410],
      },
    },
    period: "90 days",
    profileCompletion: 82,
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
  profileCompletion: 82,
  profileTasks: dashboardFixtureProfileTasks,
  rating: {
    categories: ["Hair transplant", "Dental implants", "Laser eye surgery"],
    count: 1_248,
    pendingResponses: 1,
    value: 4.8,
  },
  reporting: reportingSnapshots,
} satisfies DashboardSnapshot

export const dashboardViewModel = {
  clinicPreview: {
    coverAlt: "Exterior of Berlin Health Clinic",
    coverImage: exteriorImage,
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
  selectedMetric: createDashboardMetricSelection(reportingSnapshots["7 days"], "views"),
} satisfies DashboardViewModel
import exteriorImage from "@/assets/clinic-dashboard/exterior.jpg"
