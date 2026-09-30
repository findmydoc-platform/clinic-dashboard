import "server-only"

import type {
  ClinicDashboardReporting,
  ClinicDashboardReportingPeriodDays,
} from "../model/clinic-dashboard-reporting"
import type { ClinicDashboardReportingProvider } from "./reporting-provider"

function countMetric<Source extends "payload" | "posthog">(source: Source, value: number) {
  return {
    comparison: {
      absoluteDelta: 2,
      relativeDeltaPercent: 12.5,
      state: "available" as const,
      value: value - 2,
    },
    current: { state: "available" as const, value },
    source,
  }
}

function reportingPeriod(periodDays: ClinicDashboardReportingPeriodDays) {
  if (periodDays === 7) {
    return {
      comparisonFrom: "2026-09-03T12:00:00.000Z",
      comparisonTo: "2026-09-10T12:00:00.000Z",
      from: "2026-09-10T12:00:00.000Z",
      profileViews: 71,
      to: "2026-09-17T12:00:00.000Z",
    }
  }
  if (periodDays === 90) {
    return {
      comparisonFrom: "2026-03-21T12:00:00.000Z",
      comparisonTo: "2026-06-19T12:00:00.000Z",
      from: "2026-06-19T12:00:00.000Z",
      profileViews: 902,
      to: "2026-09-17T12:00:00.000Z",
    }
  }
  return {
    comparisonFrom: "2026-07-19T12:00:00.000Z",
    comparisonTo: "2026-08-18T12:00:00.000Z",
    from: "2026-08-18T12:00:00.000Z",
    profileViews: 284,
    to: "2026-09-17T12:00:00.000Z",
  }
}

function createControlledReporting(periodDays: ClinicDashboardReportingPeriodDays): ClinicDashboardReporting {
  const period = reportingPeriod(periodDays)
  return {
    asOf: "2026-09-17T12:00:00.000Z",
    comparisonPeriod: {
      days: periodDays,
      from: period.comparisonFrom,
      to: period.comparisonTo,
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
      profileViews: countMetric("posthog", period.profileViews),
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
    period: { days: periodDays, from: period.from, to: period.to },
    schemaVersion: "clinic-dashboard-reporting-v1",
    timezone: "Europe/Istanbul",
  }
}

export function createControlledClinicDashboardReportingProvider(): ClinicDashboardReportingProvider {
  return {
    async loadReporting(periodDays) {
      return { ok: true, value: createControlledReporting(periodDays) }
    },
  }
}
