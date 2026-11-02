import { describe, expect, it } from "vitest"
import {
  createDashboardOverview,
  createDashboardClinicPreview,
} from "@/features/clinic-dashboard/dashboard/dashboard-overview.mapper"
import { clinicDashboardReportingFixture } from "@/features/clinic-dashboard/dashboard/testing/clinic-dashboard-reporting.fixtures"
import { dashboardProfileProgressError } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"
import { dashboardProfileProgressReady } from "@/features/clinic-dashboard/dashboard/testing/dashboard.fixtures"
import { clinicProfileSourceDraftFixture } from "@/features/clinic-dashboard/clinic-profile/testing/clinic-profile-source.fixtures"
import { clinicGallerySnapshotFixture } from "@/features/clinic-dashboard/clinic-profile/testing/clinic-profile.fixtures"

describe("dashboard overview presentation", () => {
  it("shows consent-based inquiry starters and their own available current window", () => {
    const model = createDashboardOverview({
      reporting: {
        status: "ready",
        reporting: {
          ...clinicDashboardReportingFixture,
          metrics: {
            ...clinicDashboardReportingFixture.metrics,
            inquiryStarters: {
              source: "posthog",
              current: { state: "available", value: 12 },
              comparison: {
                state: "partial_coverage",
                value: null,
                absoluteDelta: null,
                relativeDeltaPercent: null,
              },
            },
          },
        },
      },
      periodDays: 30,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: { status: "unavailable", name: "Controlled clinic" },
      selectedMetricId: "inquiryStarters",
    })
    expect(model.selectedMetric).toMatchObject({
      id: "inquiryStarters",
      label: "Inquiry starters",
      value: "12",
      availability: "available",
    })
    expect(model.selectedMetric.comparison).toBeUndefined()
    expect(model.selectedMetric.information).toContain("once per clinic and period")
    expect(model.selectedMetric.information).toContain("Unique Visitors")
  })

  it("shows accepted search impressions with their visibility and view counting boundaries", () => {
    const model = createDashboardOverview({
      reporting: {
        status: "ready",
        reporting: {
          ...clinicDashboardReportingFixture,
          metrics: {
            ...clinicDashboardReportingFixture.metrics,
            impressions: {
              source: "posthog",
              current: { state: "available", value: 600 },
              comparison: { state: "available", value: 500, absoluteDelta: 100, relativeDeltaPercent: 20 },
            },
          },
        },
      },
      periodDays: 30,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: { status: "unavailable", name: "Controlled clinic" },
      selectedMetricId: "impressions",
    })
    expect(model.selectedMetric).toMatchObject({ id: "impressions", availability: "available", value: "600" })
    expect(model.selectedMetric.information).toContain("active browser window")
    expect(model.selectedMetric.information).toContain("once per result view")
    expect(model.selectedMetric.information).toContain("consent")
  })
  it("shows distinct browser visitors in the selected detail and preserves independent Payload facts", () => {
    const model = createDashboardOverview({
      reporting: { status: "ready", reporting: clinicDashboardReportingFixture },
      periodDays: 30,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: { status: "unavailable", name: "Controlled clinic" },
      selectedMetricId: "uniqueVisitors",
    })
    expect(model.selectedMetric).toMatchObject({
      id: "uniqueVisitors",
      value: "200",
      availability: "available",
    })
    expect(model.selectedMetric.information).toContain("Browser or device changes")
    expect(model.journey.find((stage) => stage.id === "profileViews")?.value).toBe("284")
    expect(model.journey.find((stage) => stage.id === "inquiries")?.value).toBe("7")
    expect(model.reviews.average).toBe("4.8 / 5")
    expect(model.metrics.find((metric) => metric.id === "completion")?.value).toBe("67%")
  })
  it.each([
    ["available", 0, "0", "available", undefined],
    ["partial_coverage", null, "Not available", "unavailable", "Incomplete data coverage"],
    ["source_unavailable", null, "Not available", "unavailable", "Data source unavailable"],
  ] as const)(
    "keeps the impressions %s state distinct in its selected detail",
    (state, value, expectedValue, availability, detail) => {
      const model = createDashboardOverview({
        reporting: {
          status: "ready",
          reporting: {
            ...clinicDashboardReportingFixture,
            metrics: {
              ...clinicDashboardReportingFixture.metrics,
              impressions: {
                source: "posthog",
                current: { state, value },
                comparison: {
                  state: "partial_coverage",
                  value: null,
                  absoluteDelta: null,
                  relativeDeltaPercent: null,
                },
              },
            },
          },
        },
        periodDays: 30,
        profileProgress: dashboardProfileProgressReady,
        clinicPreview: { status: "unavailable", name: "Controlled clinic" },
        selectedMetricId: "impressions",
      })
      expect(model.selectedMetric).toMatchObject({ id: "impressions", value: expectedValue, availability })
      expect(model.selectedMetric.detail).toBe(detail)
      expect(model.selectedMetric.comparison).toBeUndefined()
      if (state === "available")
        expect(model.selectedMetric.information).toContain(
          "preceding period does not have complete measurement coverage",
        )
    },
  )
  it("shows no rating and no period claim when there are no public reviews", () => {
    const model = createDashboardOverview({
      reporting: {
        status: "ready",
        reporting: {
          ...clinicDashboardReportingFixture,
          metrics: {
            ...clinicDashboardReportingFixture.metrics,
            reviews: {
              source: "payload",
              average: { source: "payload", comparison: null, state: "no_reviews", value: null },
              count: { source: "payload", comparison: null, state: "available", value: 0 },
            },
          },
        },
      },
      periodDays: 7,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: { status: "unavailable", name: "Controlled clinic" },
      selectedMetricId: "profileViews",
    })
    expect(model.reviews).toEqual({
      average: "No reviews yet",
      count: "0",
      rating: null,
      detail: "No public reviews are available.",
    })
  })

  it("does not reconstruct values or retain stale reviews when the reporting request fails", () => {
    const model = createDashboardOverview({
      reporting: { status: "temporarily-unavailable" },
      periodDays: 90,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: { status: "unavailable", name: "Controlled clinic" },
      selectedMetricId: "profileViews",
    })
    expect(model.selectedMetric.value).toBe("Not available")
    expect(model.reviews.rating).toBeNull()
    expect(model.profileProgress).toBe(dashboardProfileProgressReady)
  })
  it("shows a measured zero while incomplete impressions remain unavailable", () => {
    const model = createDashboardOverview({
      reporting: {
        status: "ready",
        reporting: {
          ...clinicDashboardReportingFixture,
          metrics: {
            ...clinicDashboardReportingFixture.metrics,
            profileViews: {
              ...clinicDashboardReportingFixture.metrics.profileViews,
              current: { state: "available", value: 0 },
            },
          },
        },
      },
      periodDays: 30,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: { status: "unavailable", name: "Controlled clinic" },
      selectedMetricId: "profileViews",
    })
    expect(model.metrics.find((metric) => metric.id === "profileViews")?.value).toBe("0")
    expect(model.selectedMetric.value).toBe("0")
    expect(model.metrics.find((metric) => metric.id === "impressions")?.value).toBe("Not available")
  })
  it("uses the published profile and first published gallery image, never the draft", () => {
    const clinic = createDashboardClinicPreview({
      clinicName: "Authorized clinic",
      profile: {
        ...clinicProfileSourceDraftFixture,
        draft: { ...clinicProfileSourceDraftFixture.draft, name: "Unpublished name" },
      },
      galleryStatus: "ready",
      gallery: {
        ...clinicGallerySnapshotFixture,
        items: [
          { id: "draft-image", alt: "Unpublished image", url: "/draft.jpg", status: "draft" },
          { id: "published-image", alt: "Published main image", url: "/published.jpg", status: "published" },
        ],
      },
    })
    expect(clinic).toMatchObject({
      status: "available",
      name: "Medicana International Istanbul",
      location: "Istanbul, Türkiye",
      coverImage: "/published.jpg",
    })
  })
  it("keeps reporting usable without claiming partial public profile progress", () => {
    const model = createDashboardOverview({
      reporting: { status: "ready", reporting: clinicDashboardReportingFixture },
      periodDays: 30,
      profileProgress: dashboardProfileProgressError,
      clinicPreview: { status: "unavailable", name: "Controlled clinic" },
      selectedMetricId: "profileViews",
    })
    expect(model.metrics.find((metric) => metric.id === "completion")?.value).toBe("Not available")
    expect(model.selectedMetric.value).toBe("284")
    expect(model.profileProgress.status).toBe("error")
    expect(model.clinicPreview.status).toBe("unavailable")
  })
})
