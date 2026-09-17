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
      relativeDeltaPercent: 12.5,
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
    ctaInteractions: {
      byCtaId: {
        choose_treatment: countMetric("posthog", 8),
        contact: countMetric("posthog", 12),
        contact_doctor: countMetric("posthog", 3),
      },
      source: "posthog",
      total: countMetric("posthog", 23),
    },
    inquiries: countMetric("payload", 7),
    profileCompleteness: {
      comparison: null,
      completedAreas: 5,
      percent: 83.3,
      source: "payload",
      state: "available",
      totalAreas: 6,
    },
    profileViews: countMetric("posthog", 284),
    reviews: {
      average: { comparison: null, source: "payload", state: "available", value: 4.8 },
      count: { comparison: null, source: "payload", state: "available", value: 25 },
      source: "payload",
    },
    sessionConversion: {
      comparison: {
        denominatorSessions: 180,
        numeratorSessions: 6,
        percentagePointDelta: 1.2,
        ratePercent: 3.3,
        state: "available",
      },
      current: {
        denominatorSessions: 200,
        numeratorSessions: 9,
        ratePercent: 4.5,
        state: "available",
      },
      source: "posthog",
    },
  },
  period: {
    days: 30,
    from: "2026-08-18T12:00:00.000Z",
    to: "2026-09-17T12:00:00.000Z",
  },
  schemaVersion: "clinic-dashboard-reporting-v1",
  timezone: "Europe/Istanbul",
} as const satisfies ClinicDashboardReporting

export const clinicDashboardReportingWithSourceUnavailable = {
  ...clinicDashboardReportingFixture,
  metrics: {
    ...clinicDashboardReportingFixture.metrics,
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
    ctaInteractions: {
      ...clinicDashboardReportingFixture.metrics.ctaInteractions,
      total: {
        ...clinicDashboardReportingFixture.metrics.ctaInteractions.total,
        comparison: {
          absoluteDelta: null,
          relativeDeltaPercent: null,
          state: "partial_coverage",
          value: null,
        },
        current: { state: "partial_coverage", value: null },
      },
    },
  },
} as const satisfies ClinicDashboardReporting
