import type {
  ClinicDashboardReporting,
  ClinicDashboardReportingCountMetric,
} from "../model/clinic-dashboard-reporting"

function countMetric<Source extends "payload" | "posthog">(
  source: Source,
  value: number,
): ClinicDashboardReportingCountMetric<Source> {
  return {
    comparison: {
      absoluteDelta: 2,
      relativeDeltaPercent: (2 / (value - 2)) * 100,
      state: "available",
      value: value - 2,
    },
    current: { state: "available", value },
    source,
  }
}

export const clinicDashboardReportingFixture = {
  asOf: "2026-09-17T12:00:00.000Z",
  comparisonPeriod: {
    days: 30,
    from: "2026-07-19T12:00:00.000Z",
    to: "2026-08-18T12:00:00.000Z",
  },
  metrics: {
    inquiries: countMetric("payload", 7),
    profileViews: countMetric("posthog", 284),
    uniqueVisitors: countMetric("posthog", 200),
    impressions: {
      source: "posthog",
      current: { state: "partial_coverage", value: null },
      comparison: { state: "partial_coverage", value: null, absoluteDelta: null, relativeDeltaPercent: null },
    },
    inquiryStarters: countMetric("posthog", 12),
    reviews: {
      average: { comparison: null, source: "payload", state: "available", value: 4.8 },
      count: { comparison: null, source: "payload", state: "available", value: 25 },
      source: "payload",
    },
  },
  period: {
    days: 30,
    from: "2026-08-18T12:00:00.000Z",
    to: "2026-09-17T12:00:00.000Z",
  },
  schemaVersion: "clinic-dashboard-reporting-v2",
  timezone: "Europe/Istanbul",
} as const satisfies ClinicDashboardReporting

export const clinicDashboardReportingWithSourceUnavailable = {
  ...clinicDashboardReportingFixture,
  metrics: {
    ...clinicDashboardReportingFixture.metrics,
    inquiryStarters: {
      ...clinicDashboardReportingFixture.metrics.inquiryStarters,
      current: { state: "source_unavailable", value: null },
      comparison: {
        state: "source_unavailable",
        value: null,
        absoluteDelta: null,
        relativeDeltaPercent: null,
      },
    },
    uniqueVisitors: {
      ...clinicDashboardReportingFixture.metrics.uniqueVisitors,
      current: { state: "source_unavailable", value: null },
      comparison: {
        state: "source_unavailable",
        value: null,
        absoluteDelta: null,
        relativeDeltaPercent: null,
      },
    },
    profileViews: {
      ...clinicDashboardReportingFixture.metrics.profileViews,
      comparison: {
        absoluteDelta: null,
        relativeDeltaPercent: null,
        state: "source_unavailable",
        value: null,
      },
      current: { state: "source_unavailable", value: null },
    },
  },
} as const satisfies ClinicDashboardReporting

export const clinicDashboardReportingWithPartialCoverage = {
  ...clinicDashboardReportingFixture,
  metrics: {
    ...clinicDashboardReportingFixture.metrics,
    inquiryStarters: {
      ...clinicDashboardReportingFixture.metrics.inquiryStarters,
      current: { state: "partial_coverage", value: null },
      comparison: { state: "partial_coverage", value: null, absoluteDelta: null, relativeDeltaPercent: null },
    },
    uniqueVisitors: {
      ...clinicDashboardReportingFixture.metrics.uniqueVisitors,
      current: { state: "partial_coverage", value: null },
      comparison: { state: "partial_coverage", value: null, absoluteDelta: null, relativeDeltaPercent: null },
    },
    profileViews: {
      ...clinicDashboardReportingFixture.metrics.profileViews,
      comparison: { absoluteDelta: null, relativeDeltaPercent: null, state: "partial_coverage", value: null },
      current: { state: "partial_coverage", value: null },
    },
  },
} as const satisfies ClinicDashboardReporting
