import "server-only"

import { z } from "zod"
import { validateEnvironment } from "@/lib/env"
import {
  clinicDashboardReportingPeriodDays,
  clinicDashboardReportingSchemaVersion,
  type ClinicDashboardReportingPeriodDays,
} from "../model/clinic-dashboard-reporting"
import type {
  ClinicDashboardReportingProvider,
  ClinicDashboardReportingProviderError,
  ClinicDashboardReportingProviderResult,
} from "./reporting-provider"

const sourceStateSchema = z.enum(["available", "source_unavailable", "partial_coverage"])
const countValueSchema = z.number().int().nonnegative().nullable()
const percentageSchema = z.number().finite().nullable()
const timestampSchema = z
  .string()
  .datetime({ offset: true, precision: 3 })
  .refine((value) => value.endsWith("Z"), "Expected a UTC ISO-8601 timestamp")
const periodDaysSchema = z.union(
  clinicDashboardReportingPeriodDays.map((periodDays) => z.literal(periodDays)) as [
    z.ZodLiteral<7>,
    z.ZodLiteral<30>,
    z.ZodLiteral<90>,
  ],
)
const periodSchema = z.object({ days: periodDaysSchema, from: timestampSchema, to: timestampSchema })
const metricValueSchema = z.object({ state: sourceStateSchema, value: countValueSchema })
const countMetricSchema = <Source extends "payload" | "posthog">(source: Source) =>
  z.object({
    comparison: metricValueSchema.extend({
      absoluteDelta: z.number().int().nullable(),
      relativeDeltaPercent: percentageSchema,
    }),
    current: metricValueSchema,
    source: z.literal(source),
  })
const conversionWindowSchema = z.object({
  denominatorSessions: countValueSchema,
  numeratorSessions: countValueSchema,
  ratePercent: percentageSchema,
  state: z.union([sourceStateSchema, z.literal("zero_denominator")]),
})

const clinicDashboardReportingSchema = z.object({
  asOf: timestampSchema,
  comparisonPeriod: periodSchema,
  metrics: z.object({
    ctaInteractions: z.object({
      byCtaId: z.object({
        choose_treatment: countMetricSchema("posthog"),
        contact: countMetricSchema("posthog"),
        contact_doctor: countMetricSchema("posthog"),
      }),
      source: z.literal("posthog"),
      total: countMetricSchema("posthog"),
    }),
    inquiries: countMetricSchema("payload"),
    profileCompleteness: z.object({
      comparison: z.null(),
      completedAreas: z.number().int().min(0).max(6).nullable(),
      percent: z.number().min(0).max(100).nullable(),
      source: z.literal("payload"),
      state: sourceStateSchema,
      totalAreas: z.literal(6),
    }),
    profileViews: countMetricSchema("posthog"),
    reviews: z.object({
      average: z.object({
        comparison: z.null(),
        source: z.literal("payload"),
        state: z.union([sourceStateSchema, z.literal("no_reviews")]),
        value: z.number().min(1).max(5).nullable(),
      }),
      count: z.object({
        comparison: z.null(),
        source: z.literal("payload"),
        state: sourceStateSchema,
        value: countValueSchema,
      }),
      source: z.literal("payload"),
    }),
    sessionConversion: z.object({
      comparison: conversionWindowSchema.extend({ percentagePointDelta: percentageSchema }),
      current: conversionWindowSchema,
      source: z.literal("posthog"),
    }),
  }),
  period: periodSchema,
  schemaVersion: z.literal(clinicDashboardReportingSchemaVersion),
  timezone: z.literal("Europe/Istanbul"),
})

type PayloadResponse = Readonly<{ ok: true; value: unknown }> | Readonly<{ ok: false; status?: number }>

function endpointFor(periodDays: ClinicDashboardReportingPeriodDays) {
  const endpoint = new URL("/api/clinic-dashboard/reporting", validateEnvironment().PAYLOAD_API_URL)
  endpoint.searchParams.set("periodDays", String(periodDays))
  return endpoint
}

function hasPrivateReportingHeaders(response: Response) {
  const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? ""
  const pragma = response.headers.get("pragma")?.toLowerCase() ?? ""
  const varyFields = new Set(
    (response.headers.get("vary") ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  )

  return (
    cacheControl.includes("private") &&
    cacheControl.includes("no-store") &&
    pragma === "no-cache" &&
    response.headers.get("expires") === "0" &&
    varyFields.has("authorization")
  )
}

function errorForStatus(status: number | undefined): ClinicDashboardReportingProviderError {
  if (status === 401) return "unauthorized"
  if (status === 403) return "access-denied"
  return "temporarily-unavailable"
}

async function requestPayloadJson(
  accessToken: string,
  periodDays: ClinicDashboardReportingPeriodDays,
  fetcher: typeof fetch,
): Promise<PayloadResponse> {
  try {
    const response = await fetcher(endpointFor(periodDays), {
      cache: "no-store",
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    })
    if (!hasPrivateReportingHeaders(response)) return { ok: false }
    if (!response.ok) return { ok: false, status: response.status }
    return { ok: true, value: await response.json().catch(() => null) }
  } catch {
    return { ok: false }
  }
}

export function createPayloadClinicDashboardReportingProvider(
  accessToken: string,
  fetcher: typeof fetch = fetch,
): ClinicDashboardReportingProvider {
  return {
    async loadReporting(periodDays): Promise<ClinicDashboardReportingProviderResult> {
      const response = await requestPayloadJson(accessToken, periodDays, fetcher)
      if (!response.ok) return { error: errorForStatus(response.status), ok: false }

      const parsed = clinicDashboardReportingSchema.safeParse(response.value)
      return parsed.success ? { ok: true, value: parsed.data } : { error: "invalid-data", ok: false }
    },
  }
}
