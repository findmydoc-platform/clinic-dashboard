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
  it("uses session counts for the funnel and preserves independent Payload facts on an analytics outage", () => {
    const ready = createDashboardOverview({
      reporting: { status: "ready", reporting: clinicDashboardReportingFixture },
      periodDays: 30,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: { status: "unavailable", name: "Controlled clinic" },
      selectedMetricId: "sessionConversion",
    })
    expect(ready.sessionFunnel).toMatchObject({
      profileSessions: "200",
      convertedSessions: "9",
      conversion: "4.5%",
    })
    expect(ready.metrics.find((metric) => metric.id === "inquiries")?.value).toBe("7")
    expect(ready.metrics.find((metric) => metric.id === "completion")?.value).toBe("67%")
    const outage = createDashboardOverview({
      reporting: {
        status: "ready",
        reporting: {
          ...clinicDashboardReportingFixture,
          metrics: {
            ...clinicDashboardReportingFixture.metrics,
            profileViews: {
              ...clinicDashboardReportingFixture.metrics.profileViews,
              current: { state: "source_unavailable", value: null },
            },
            sessionConversion: {
              ...clinicDashboardReportingFixture.metrics.sessionConversion,
              current: {
                state: "source_unavailable",
                denominatorSessions: null,
                numeratorSessions: null,
                ratePercent: null,
              },
            },
          },
        },
      },
      periodDays: 30,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: { status: "unavailable", name: "Controlled clinic" },
      selectedMetricId: "profileViews",
    })
    expect(outage.selectedMetric.value).toBe("Not available")
    expect(outage.sessionFunnel.conversion).toBeUndefined()
    expect(outage.sessionFunnel.profileSessions).toBe("Not available")
    expect(outage.metrics.find((metric) => metric.id === "inquiries")?.value).toBe("7")
    expect(outage.reviews.average).toBe("4.8 / 5")
  })

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
