"use client"

import { useId } from "react"
import {
  OperationalWorkloadCard,
  type OperationalWorkloadCardState,
} from "../molecules/OperationalWorkloadCard"
import type { ReviewWorkloadState } from "@/features/clinic-dashboard/reviews/public"
import { PageHeading } from "@/components/ui/page-heading"
import type { DashboardActions, DashboardViewModel } from "../../model/dashboard-view-model"
import { createDashboardProfileCompletionMetric } from "../../model/profile-progress"
import { DashboardSummaryCard } from "../molecules/DashboardSummaryCard"
import { ClinicPreview } from "./ClinicPreview"
import { ConversionFunnel } from "./ConversionFunnel"
import { DashboardMetricPanel } from "./DashboardMetricPanel"
import { ProfileProgress } from "./ProfileProgress"
import { ReviewSummary } from "./ReviewSummary"

type DashboardScreenProps = Readonly<{
  inquiryInventory?: OperationalWorkloadCardState
  onInquiriesOpen?: () => void
  onInquiryInventoryRetry?: () => void
  actions: DashboardActions
  canDownloadProfileViews: boolean
  reviewWorkload?: ReviewWorkloadState
  onReviewWorkloadOpen?: () => void
  onReviewWorkloadRetry?: () => void
  model: DashboardViewModel
}>

export function DashboardScreen({
  actions,
  canDownloadProfileViews,
  model,
  inquiryInventory = { status: "unavailable" },
  onInquiriesOpen = () => undefined,
  onInquiryInventoryRetry = () => undefined,
  reviewWorkload,
  onReviewWorkloadOpen,
  onReviewWorkloadRetry,
}: DashboardScreenProps) {
  const metricPanelId = useId()
  const profileCompletionMetric = createDashboardProfileCompletionMetric(model.profileProgress)

  return (
    <div className="space-y-6">
      <PageHeading>Dashboard</PageHeading>

      <section aria-label="Dashboard metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardSummaryCard
          className="sm:col-span-2 xl:col-span-1"
          title={profileCompletionMetric.label}
          state={
            model.profileProgress.status === "ready"
              ? {
                  status: "ready",
                  value: profileCompletionMetric.value,
                  progress: model.profileProgress.percent,
                  detail: `${model.profileProgress.completedAreaCount} of ${model.profileProgress.totalAreaCount} profile areas complete`,
                }
              : model.profileProgress.status === "loading"
                ? {
                    status: "loading",
                    value: profileCompletionMetric.value,
                    detail: profileCompletionMetric.note,
                  }
                : {
                    status: "unavailable",
                    value: profileCompletionMetric.value,
                    detail: profileCompletionMetric.note,
                  }
          }
          action={{ kind: "static" }}
        />
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
              ? { status: "ready", count: reviewWorkload.workload.reviewsToAnswerCount }
              : { status: reviewWorkload?.status ?? "loading" }
          }
          description="Public reviews without a submitted response"
          emptyDescription="No reviews awaiting your response"
          secondaryText={
            reviewWorkload?.status === "ready" && reviewWorkload.workload.pendingModerationCount > 0
              ? `${reviewWorkload.workload.pendingModerationCount} ${reviewWorkload.workload.pendingModerationCount === 1 ? "response" : "responses"} pending moderation`
              : undefined
          }
          onOpen={onReviewWorkloadOpen ?? actions.onReviewsOpen}
          onRetry={onReviewWorkloadRetry ?? (() => undefined)}
        />
      </section>

      <div
        className="grid gap-6 xl:grid-cols-[0.8fr_1.7fr_0.8fr] xl:items-stretch"
        data-dashboard-content-grid
      >
        <div className="min-w-0 xl:col-start-1 xl:row-start-2" data-dashboard-profile-progress>
          <ProfileProgress
            onRetry={actions.onProfileProgressRetry}
            onTaskOpen={actions.onProfileTaskOpen}
            progress={model.profileProgress}
          />
        </div>
        <div className="min-w-0 xl:col-span-3 xl:col-start-1 xl:row-start-1" data-dashboard-funnel>
          <ConversionFunnel
            controlsId={metricPanelId}
            onMetricSelect={actions.onMetricSelect}
            period={model.reporting.period}
            selectedMetricId={model.selectedMetric.id}
            steps={model.reporting.funnel}
          />
        </div>
        <div className="min-w-0 xl:col-start-2 xl:row-start-2" data-dashboard-metric-panel>
          <DashboardMetricPanel
            canDownloadProfileViews={canDownloadProfileViews}
            id={metricPanelId}
            metric={model.selectedMetric}
            onDownloadProfileViews={actions.onProfileViewsDownload}
            period={model.reporting.period}
          />
        </div>
        <div
          className="grid min-w-0 gap-6 xl:col-start-3 xl:row-start-2 xl:h-full xl:grid-rows-[auto_1fr]"
          data-dashboard-summary-column
        >
          <ReviewSummary
            onOpen={actions.onReviewsOpen}
            rating={model.rating}
            reviewActivity={model.reporting.reviewActivity}
          />
          <ClinicPreview clinic={model.clinicPreview} />
        </div>
      </div>
    </div>
  )
}
