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
      relativeDeltaPercent: (2 / (value - 2)) * 100,
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
      inquiries: countMetric("payload", 7),
      profileViews: countMetric("posthog", period.profileViews),
      uniqueVisitors: countMetric("posthog", periodDays === 7 ? 50 : periodDays === 90 ? 600 : 200),
      impressions: {
        source: "posthog",
        current: { state: "partial_coverage", value: null },
        comparison: {
          state: "partial_coverage",
          value: null,
          absoluteDelta: null,
          relativeDeltaPercent: null,
        },
      },
      inquiryStarters: countMetric("posthog", 12),
      reviews: {
        average: { comparison: null, source: "payload", state: "available", value: 4.8 },
        count: { comparison: null, source: "payload", state: "available", value: 25 },
        source: "payload",
      },
    },
    period: { days: periodDays, from: period.from, to: period.to },
    schemaVersion: "clinic-dashboard-reporting-v2",
    timezone: "Europe/Istanbul",
  }
}

export function createControlledClinicDashboardReportingProvider(
  clinicId = "controlled-clinic",
): ClinicDashboardReportingProvider {
  return {
    async loadReporting(periodDays) {
      const reporting = createControlledReporting(periodDays)
      if (clinicId === "controlled-second-clinic") {
        return {
          ok: true,
          value: {
            ...reporting,
            metrics: {
              ...reporting.metrics,
              uniqueVisitors: countMetric("posthog", periodDays === 7 ? 12 : 75),
              profileViews: countMetric("posthog", periodDays === 7 ? 17 : 109),
            },
          },
        }
      }
      return { ok: true, value: reporting }
    },
  }
}
