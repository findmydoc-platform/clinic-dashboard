"use client"

import { PageHeading } from "@/components/ui/page-heading"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useId } from "react"
import type { DashboardOverviewModel, DashboardReportingMetricId } from "../../model/dashboard-overview"
import type { DashboardProfileTask } from "../../model/profile-tasks"
import { ReportingMetricCard } from "../molecules/ReportingMetricCard"
import { ReportingInformation } from "../molecules/ReportingInformation"
import { ProfileProgress } from "./ProfileProgress"
import { ClinicPreview } from "./ClinicPreview"
import { ReviewSummary } from "./ReviewSummary"
import { ReportingSessionFunnel } from "./ReportingSessionFunnel"

type DashboardOverviewScreenProps = Readonly<{
  model: DashboardOverviewModel
  onMetricSelect: (id: DashboardReportingMetricId) => void
  onProfileTaskOpen: (task: DashboardProfileTask) => void
  onProfileProgressRetry: () => void
  onReviewsOpen: () => void
  onReportingRetry: () => void
}>

export function DashboardOverviewScreen({
  model,
  onMetricSelect,
  onProfileTaskOpen,
  onProfileProgressRetry,
  onReviewsOpen,
  onReportingRetry,
}: DashboardOverviewScreenProps) {
  const panelId = useId()
  return (
    <div className="space-y-6">
      <PageHeading
        description={`Performance for ${model.clinicPreview.name}: activity and public profile health.`}
      >
        Dashboard
      </PageHeading>
      <section aria-label="Dashboard metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {model.metrics.map((metric) => (
          <ReportingMetricCard
            key={metric.id}
            {...metric}
            controlsId={metric.id === "completion" ? undefined : panelId}
            isSelected={metric.id === model.selectedMetric.id}
            onSelect={
              metric.id === "completion"
                ? undefined
                : () => onMetricSelect(metric.id as DashboardReportingMetricId)
            }
          />
        ))}
      </section>
      {model.reportingStatus === "temporarily-unavailable" ? (
        <div className="flex flex-wrap items-center gap-3" role="alert">
          <p>Reporting is temporarily unavailable. Independent profile information remains available.</p>
          <Button onClick={onReportingRetry} variant="outline">
            Retry reporting
          </Button>
        </div>
      ) : null}
      <div
        className="grid gap-6 xl:grid-cols-[0.8fr_1.7fr_0.8fr] xl:items-stretch"
        data-dashboard-content-grid
      >
        <div className="min-w-0 xl:col-start-1 xl:row-start-2" data-dashboard-profile-progress>
          <ProfileProgress
            progress={model.profileProgress}
            onRetry={onProfileProgressRetry}
            onTaskOpen={onProfileTaskOpen}
          />
        </div>
        <div className="min-w-0 xl:col-span-3 xl:col-start-1 xl:row-start-1" data-dashboard-funnel>
          <ReportingSessionFunnel funnel={model.sessionFunnel} periodDays={model.periodDays} />
        </div>
        <div className="min-w-0 xl:col-start-2 xl:row-start-2" data-dashboard-metric-panel>
          <Card className="flex h-full min-w-0 flex-col" id={panelId}>
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-5">
              <div>
                <h2 className="text-xl font-bold text-[var(--secondary)]">{model.selectedMetric.label}</h2>
                <p className="mt-2 text-2xl font-bold text-[var(--primary)]">{model.selectedMetric.value}</p>
                {model.selectedMetric.comparison ? (
                  <p className="mt-1 text-xs">{model.selectedMetric.comparison}</p>
                ) : null}
                {model.selectedMetric.detail ? (
                  <p className="mt-1 text-sm">{model.selectedMetric.detail}</p>
                ) : null}
              </div>
              {model.selectedMetric.information ? (
                <ReportingInformation label={`${model.selectedMetric.label} details`}>
                  {model.selectedMetric.information}
                </ReportingInformation>
              ) : null}
            </div>
            <div
              className="flex min-h-80 flex-1 flex-col items-center justify-center p-5 text-center"
              role="status"
            >
              <h3 className="font-bold text-[var(--secondary)]">Time series not available</h3>
              <p className="mt-2 max-w-xs text-sm">
                {model.selectedMetric.availability === "available"
                  ? "The selected period's measurement is shown above. "
                  : ""}
                Daily measurements and CSV downloads are not available yet.
              </p>
            </div>
            {model.selectedMetric.id === "ctaInteractions" ? (
              <dl
                aria-label="CTA interaction breakdown"
                className="grid gap-4 border-t border-[var(--border)] p-5 sm:grid-cols-3"
              >
                {model.ctaBreakdown.map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs">{item.label}</dt>
                    <dd className="mt-1 font-bold text-[var(--primary)]">{item.value}</dd>
                    {item.detail ? <dd className="mt-1 text-xs">{item.detail}</dd> : null}
                  </div>
                ))}
              </dl>
            ) : null}
          </Card>
        </div>
        <div
          className="grid min-w-0 gap-6 xl:col-start-3 xl:row-start-2 xl:h-full xl:grid-rows-[auto_1fr]"
          data-dashboard-summary-column
        >
          <ReviewSummary onOpen={onReviewsOpen} summary={model.reviews} />
          <ClinicPreview clinic={model.clinicPreview} />
        </div>
      </div>
      <p className="text-xs text-[var(--foreground)]">
        Reporting timezone: {model.timezone}
        {model.asOf
          ? ` · Observed ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: model.timezone }).format(new Date(model.asOf))}`
          : ""}
      </p>
    </div>
  )
}
