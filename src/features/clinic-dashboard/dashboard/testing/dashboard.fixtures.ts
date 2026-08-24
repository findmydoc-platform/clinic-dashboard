import exteriorImage from "@/assets/clinic-dashboard/exterior.jpg"
import type {
  ClinicGalleryMedia,
  ClinicGallerySnapshot,
  ClinicProfileCompletenessReady,
  ClinicProfileDraftCompleteness,
  ClinicTreatmentOffering,
} from "@/features/clinic-dashboard/clinic-profile/public"
import { createDashboardReportingSnapshot, type DashboardReportingSnapshots } from "../model/reporting"
import type { DashboardViewModel } from "../model/dashboard-view-model"
import type { DashboardSnapshot } from "../model/dashboard-snapshot"
import { createDashboardMetricSelection } from "../model/dashboard-metric-selection"
import { createDashboardProfileProgress, type DashboardProfileProgressReady } from "../model/profile-progress"

const galleryItems = [
  { alt: "Exterior", id: "image-1", status: "published", url: "/1.jpg" },
  { alt: "Reception", id: "image-2", status: "published", url: "/2.jpg" },
  { alt: "Treatment room", id: "image-3", status: "published", url: "/3.jpg" },
] as const satisfies readonly ClinicGalleryMedia[]

const gallerySnapshot = {
  constraints: {
    acceptedMimeTypes: ["image/jpeg"],
    maxConcurrentUploads: 3,
    maxFileBytes: 5_000_000,
    maxItems: 20,
    maxPixels: 20_000_000,
  },
  items: galleryItems,
  revision: 1,
} as const satisfies ClinicGallerySnapshot

const profileAreas = [
  { complete: true, id: "basic-information", missingFields: [] },
  { complete: true, id: "address", missingFields: [] },
  { complete: true, id: "languages", missingFields: [] },
  { complete: true, id: "opening-hours", missingFields: [] },
] as const satisfies ClinicProfileCompletenessReady["areas"]

const noDraft = {
  changedAreas: [],
  completedAreaCount: 4,
  missingAreas: [],
  state: "none",
} as const satisfies ClinicProfileDraftCompleteness

const treatmentOffering = {
  active: true,
  id: "offering-1",
  price: 1_200,
  revision: "1",
  treatment: { descriptionText: "Treatment", id: "treatment-1", name: "Treatment" },
} as const satisfies ClinicTreatmentOffering

function requireReadyProgress(
  result: ReturnType<typeof createDashboardProfileProgress>,
): DashboardProfileProgressReady {
  if (result.status !== "ready") throw new Error("Expected ready dashboard profile fixture")
  return result
}

function createProfileProgressFixture({
  draft = noDraft,
  images = galleryItems,
  publishedAreas = profileAreas,
  treatments = [treatmentOffering],
}: Readonly<{
  draft?: ClinicProfileDraftCompleteness
  images?: readonly ClinicGalleryMedia[]
  publishedAreas?: ClinicProfileCompletenessReady["areas"]
  treatments?: readonly ClinicTreatmentOffering[]
}> = {}) {
  return requireReadyProgress(
    createDashboardProfileProgress({
      gallery: {
        snapshot: { ...gallerySnapshot, items: images },
        status: "ready",
      },
      profile: {
        draft,
        published: {
          areas: publishedAreas,
          completedAreaCount: publishedAreas.filter((area) => area.complete).length,
          status: "ready",
        },
      },
      taskActionability: {
        canEditGallery: true,
        canEditProfile: true,
        canEditTreatments: true,
      },
      treatments: { catalogue: [], offerings: treatments, status: "ready" },
    }),
  )
}

export const dashboardProfileProgressReady = createProfileProgressFixture({
  images: [galleryItems[0]],
  treatments: [],
})

export const dashboardProfileProgressComplete = createProfileProgressFixture()

export const dashboardProfileProgressEmpty = createProfileProgressFixture({
  images: [],
  publishedAreas: [
    { complete: false, id: "basic-information", missingFields: ["name", "descriptionText"] },
    {
      complete: false,
      id: "address",
      missingFields: ["address.street", "address.houseNumber", "address.cityId", "address.zipCode"],
    },
    { complete: false, id: "languages", missingFields: ["supportedLanguages"] },
    {
      complete: false,
      id: "opening-hours",
      missingFields: ["openingHours.monday", "openingHours.tuesday"],
    },
  ],
  treatments: [],
})

export const dashboardProfileProgressDraft = createProfileProgressFixture({
  draft: {
    changedAreas: ["basic-information", "languages"],
    completedAreaCount: 2,
    missingAreas: ["address", "opening-hours"],
    state: "incomplete",
  },
})

export const dashboardProfileProgressPublishReady = createProfileProgressFixture({
  draft: {
    changedAreas: ["basic-information", "opening-hours"],
    completedAreaCount: 4,
    missingAreas: [],
    state: "publish-ready",
  },
})

export const dashboardProfileProgressConflict = createProfileProgressFixture({
  draft: {
    changedAreas: ["address"],
    completedAreaCount: 4,
    missingAreas: [],
    state: "conflict",
  },
})

export const dashboardProfileProgressError = {
  message: "Public profile progress is temporarily unavailable.",
  reason: "gallery-unavailable",
  status: "error",
} as const

export const dashboardProfileProgressLoading = { status: "loading" } as const

export const dashboardProfileTasks = dashboardProfileProgressEmpty.tasks

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
  profileProgress: dashboardProfileProgressReady,
  rating: {
    categories: ["Hair transplant", "Dental implants", "Laser eye surgery"],
    count: 1_248,
    pendingResponses: 1,
    value: 4.8,
  },
  reporting: reportingSnapshots["7 days"],
  selectedMetric: createDashboardMetricSelection(reportingSnapshots["7 days"], "views"),
} satisfies DashboardViewModel
