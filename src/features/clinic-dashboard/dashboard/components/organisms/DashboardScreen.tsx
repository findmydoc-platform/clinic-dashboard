"use client"

import { useId } from "react"
import { PageHeading } from "@/components/ui/page-heading"
import type { DashboardActions, DashboardViewModel } from "../../model/dashboard-view-model"
import { createDashboardProfileCompletionMetric } from "../../model/profile-progress"
import { MetricCard } from "../molecules/MetricCard"
import { ClinicPreview } from "./ClinicPreview"
import { ConversionFunnel } from "./ConversionFunnel"
import { DashboardMetricPanel } from "./DashboardMetricPanel"
import { ProfileProgress } from "./ProfileProgress"
import { ReviewSummary } from "./ReviewSummary"

type DashboardScreenProps = Readonly<{
  actions: DashboardActions
  canDownloadProfileViews: boolean
  model: DashboardViewModel
}>

export function DashboardScreen({ actions, canDownloadProfileViews, model }: DashboardScreenProps) {
  const metricPanelId = useId()
  const profileCompletionMetric = createDashboardProfileCompletionMetric(model.profileProgress)

  return (
    <div className="space-y-6">
      <PageHeading
        description={`Performance for ${model.clinicPreview.name}: visibility, enquiries, and profile health.`}
      >
        Dashboard
      </PageHeading>

      <section aria-label="Dashboard metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[profileCompletionMetric, ...model.reporting.metrics].map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
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
