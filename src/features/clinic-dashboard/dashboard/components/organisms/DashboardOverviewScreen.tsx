"use client"

import type { ReviewWorkloadState } from "@/features/clinic-dashboard/reviews/public"
import { PageHeading } from "@/components/ui/page-heading"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useId } from "react"
import {
  OperationalWorkloadCard,
  type OperationalWorkloadCardState,
} from "../molecules/OperationalWorkloadCard"
import type { DashboardOverviewModel, DashboardJourneyStageId } from "../../model/dashboard-overview"
import { formatReportingObservationTimestamp } from "../../model/clinic-dashboard-reporting-display"
import type { DashboardProfileTask } from "../../model/profile-tasks"
import { DashboardSummaryCard } from "../molecules/DashboardSummaryCard"
import { ReportingInformation } from "../molecules/ReportingInformation"
import { ProfileProgress } from "./ProfileProgress"
import { ClinicPreview } from "./ClinicPreview"
import { ReviewSummary } from "./ReviewSummary"
import { ReportingJourneyFunnel } from "./ReportingJourneyFunnel"

type DashboardOverviewScreenProps = Readonly<{
  inquiryInventory?: OperationalWorkloadCardState
  onInquiriesOpen?: () => void
  onInquiryInventoryRetry?: () => void
  reviewWorkload?: ReviewWorkloadState
  onReviewWorkloadOpen?: () => void
  onReviewWorkloadRetry?: () => void
  model: DashboardOverviewModel
  onMetricSelect: (id: DashboardJourneyStageId) => void
  onProfileTaskOpen: (task: DashboardProfileTask) => void
  onProfileProgressRetry: () => void
  onReviewsOpen: () => void
  onReportingRetry: () => void
}>

export function DashboardOverviewScreen({
  model,
  inquiryInventory = { status: "unavailable" },
  onInquiriesOpen = () => undefined,
  onInquiryInventoryRetry = () => undefined,
  reviewWorkload,
  onReviewWorkloadOpen,
  onReviewWorkloadRetry,
  onMetricSelect,
  onProfileTaskOpen,
  onProfileProgressRetry,
  onReviewsOpen,
  onReportingRetry,
}: DashboardOverviewScreenProps) {
  const panelId = useId()
  return (
    <div className="space-y-6">
      <PageHeading>Dashboard</PageHeading>
      <section aria-label="Dashboard metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {model.metrics
          .filter((metric) => metric.id === "completion")
          .map((metric) => (
            <DashboardSummaryCard
              key={metric.id}
              className="sm:col-span-2 xl:col-span-1"
              title={metric.label}
              state={
                metric.availability === "available"
                  ? { status: "ready", value: metric.value, detail: metric.detail, progress: metric.progress }
                  : metric.availability === "loading"
                    ? { status: "loading", value: metric.value, detail: metric.detail }
                    : { status: "unavailable", value: metric.value, detail: metric.detail }
              }
              action={{ kind: "static" }}
            />
          ))}
        <OperationalWorkloadCard
          title="Open inquiries"
          actionLabel="View open inquiries"
          state={inquiryInventory}
          description="Current total"
          emptyDescription="No open inquiries"
          onOpen={onInquiriesOpen}
          onRetry={onInquiryInventoryRetry}
        />
        <OperationalWorkloadCard
          title="Reviews to answer"
          actionLabel="View published reviews"
          state={
            reviewWorkload?.status === "ready"
              ? {
                  status: "ready",
                  count: reviewWorkload.workload.reviewsToAnswerCount,
                  refreshState: reviewWorkload.refreshState,
                }
              : { status: reviewWorkload?.status ?? "loading" }
          }
          description="Public reviews without a submitted response"
          emptyDescription="No reviews awaiting your response"
          secondaryText={
            reviewWorkload?.status === "ready" && reviewWorkload.workload.pendingModerationCount > 0
              ? `${reviewWorkload.workload.pendingModerationCount} ${reviewWorkload.workload.pendingModerationCount === 1 ? "response" : "responses"} pending moderation`
              : undefined
          }
          onOpen={onReviewWorkloadOpen ?? onReviewsOpen}
          onRetry={onReviewWorkloadRetry ?? (() => undefined)}
        />
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
          <ReportingJourneyFunnel
            controlsId={panelId}
            stages={model.journey}
            selectedId={model.selectedMetric.id}
            onSelect={onMetricSelect}
            periodDays={model.periodDays}
          />
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
        {model.asOf ? ` · Observed ${formatReportingObservationTimestamp(model.asOf, model.timezone)}` : ""}
      </p>
    </div>
  )
}
