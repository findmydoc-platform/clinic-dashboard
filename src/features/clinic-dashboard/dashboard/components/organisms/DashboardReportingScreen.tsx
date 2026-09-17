"use client"

import { PageHeading } from "@/components/ui/page-heading"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ClinicDashboardReportingViewState } from "../../hooks/useClinicDashboardReportingController"
import {
  createCountMetricDisplay,
  createMetricValueDisplay,
  formatReportingPercent,
} from "../../model/clinic-dashboard-reporting-display"
import type {
  ClinicDashboardReporting,
  ClinicDashboardReportingMetricValue,
  ClinicDashboardReportingPeriodDays,
} from "../../model/clinic-dashboard-reporting"
import { ReportingMetricCard } from "../molecules/ReportingMetricCard"
import { ReportingPeriodControl } from "../molecules/ReportingPeriodControl"

type DashboardReportingScreenProps = Readonly<{
  model: ClinicDashboardReportingViewState
  onPeriodChange: (periodDays: ClinicDashboardReportingPeriodDays) => void
}>

function sessionConversionDisplay(reporting: ClinicDashboardReporting) {
  const current = reporting.metrics.sessionConversion.current
  if (current.state === "zero_denominator") {
    return { detail: "No profile sessions were recorded in this period.", value: "0%" }
  }

  const display = createMetricValueDisplay({
    state: current.state,
    value: current.ratePercent,
  } satisfies ClinicDashboardReportingMetricValue)
  return { ...display, value: formatReportingPercent(current.ratePercent) }
}

function reviewAverageDisplay(reporting: ClinicDashboardReporting) {
  const average = reporting.metrics.reviews.average
  if (average.state === "no_reviews")
    return { detail: "No reviews were recorded in this period.", value: "No reviews" }

  const display = createMetricValueDisplay({ state: average.state, value: average.value })
  return { ...display, value: average.value === null ? display.value : `${average.value.toFixed(1)} / 5` }
}

function profileCompletenessDisplay(reporting: ClinicDashboardReporting) {
  const completeness = reporting.metrics.profileCompleteness
  const display = createMetricValueDisplay({ state: completeness.state, value: completeness.percent })
  return {
    ...display,
    detail:
      completeness.state === "available" && completeness.completedAreas !== null
        ? `${completeness.completedAreas} of ${completeness.totalAreas} areas complete`
        : display.detail,
    value: formatReportingPercent(completeness.percent),
  }
}

function reportingCards(reporting: ClinicDashboardReporting) {
  const profileViews = createCountMetricDisplay(reporting.metrics.profileViews)
  const ctaInteractions = createCountMetricDisplay(reporting.metrics.ctaInteractions.total)
  const inquiries = createCountMetricDisplay(reporting.metrics.inquiries)
  const sessionConversion = sessionConversionDisplay(reporting)
  const reviewCount = createMetricValueDisplay(reporting.metrics.reviews.count)
  const reviews = reviewAverageDisplay(reporting)
  const profileCompleteness = profileCompletenessDisplay(reporting)

  return [
    { ...profileViews, label: "Profile views" },
    { ...ctaInteractions, label: "CTA interactions" },
    { ...inquiries, label: "Inquiries" },
    { ...sessionConversion, label: "Session conversion" },
    { ...reviewCount, label: "Reviews" },
    { ...reviews, label: "Review average" },
    { ...profileCompleteness, label: "Profile completeness" },
  ]
}

function CtaBreakdown({ reporting }: Readonly<{ reporting: ClinicDashboardReporting }>) {
  const ctaEntries = [
    ["Choose a treatment", reporting.metrics.ctaInteractions.byCtaId.choose_treatment],
    ["Contact clinic", reporting.metrics.ctaInteractions.byCtaId.contact],
    ["Contact doctor", reporting.metrics.ctaInteractions.byCtaId.contact_doctor],
  ] as const

  return (
    <Card>
      <div className="border-b border-[var(--border)] p-5">
        <h2 className="text-xl font-bold text-[var(--secondary)]">CTA interactions</h2>
        <p className="mt-1 text-sm text-[var(--foreground)]">
          Actions completed by visitors in the selected period.
        </p>
      </div>
      <div className="grid divide-y divide-[var(--border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {ctaEntries.map(([label, metric]) => {
          const display = createCountMetricDisplay(metric)
          return (
            <div className="p-4" key={label}>
              <p className="text-sm text-[var(--foreground)]">{label}</p>
              <p className="mt-1 text-xl font-bold text-[var(--secondary)]">{display.value}</p>
              {display.detail ? (
                <p className="mt-1 text-xs text-[var(--foreground)]">{display.detail}</p>
              ) : null}
              {display.comparison ? (
                <p className="mt-1 text-xs font-medium text-[var(--primary)]">{display.comparison}</p>
              ) : null}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export function DashboardReportingScreen({ model, onPeriodChange }: DashboardReportingScreenProps) {
  const reporting = model.status === "ready" ? model.reporting : undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeading description="Performance reporting for your clinic.">Reporting</PageHeading>
        <ReportingPeriodControl
          disabled={model.status === "loading"}
          onValueChange={onPeriodChange}
          value={model.periodDays}
        />
      </div>

      {model.status === "loading" ? (
        <Card>
          <p aria-live="polite" className="p-5 text-sm text-[var(--foreground)]" role="status">
            Loading reporting for the selected period.
          </p>
        </Card>
      ) : null}

      {model.status === "temporarily-unavailable" ? (
        <Card>
          <div aria-labelledby="reporting-unavailable-heading" className="p-5" role="alert">
            <h2 className="text-lg font-bold text-[var(--secondary)]" id="reporting-unavailable-heading">
              Reporting is temporarily unavailable
            </h2>
            <p className="mt-2 text-sm text-[var(--foreground)]">
              No reporting values are shown until the service responds again.
            </p>
            <Button className="mt-4" onClick={() => onPeriodChange(model.periodDays)} variant="outline">
              Retry reporting
            </Button>
          </div>
        </Card>
      ) : null}

      {reporting ? (
        <>
          <section aria-label="Reporting metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reportingCards(reporting).map((metric) => (
              <ReportingMetricCard key={metric.label} {...metric} />
            ))}
          </section>

          <CtaBreakdown reporting={reporting} />

          <p className="text-sm text-[var(--foreground)]">
            Reporting timezone:{" "}
            <span className="font-medium text-[var(--secondary)]">{reporting.timezone}</span>
          </p>
        </>
      ) : null}
    </div>
  )
}
