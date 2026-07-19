"use client"

import { useId } from "react"
import { PageHeading } from "@/components/ui/page-heading"
import type { DashboardActions, DashboardViewModel } from "../../model/dashboard-view-model"
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
  showCertificateTasks: boolean
}>

export function DashboardScreen({
  actions,
  canDownloadProfileViews,
  model,
  showCertificateTasks,
}: DashboardScreenProps) {
  const metricPanelId = useId()

  return (
    <div className="space-y-6">
      <PageHeading
        description={`Performance for ${model.clinicPreview.name}: visibility, enquiries, and profile health.`}
      >
        Dashboard
      </PageHeading>

      <section aria-label="Dashboard metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {model.reporting.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <ConversionFunnel
        controlsId={metricPanelId}
        onMetricSelect={actions.onMetricSelect}
        period={model.reporting.period}
        selectedMetricId={model.selectedMetric.id}
        steps={model.reporting.funnel}
      />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.7fr_0.8fr] xl:items-stretch" data-dashboard-lower-grid>
        <ProfileProgress
          completion={model.profileCompletion}
          onTaskOpen={actions.onProfileTaskOpen}
          showCertificateTasks={showCertificateTasks}
          tasks={model.profileTasks}
        />
        <DashboardMetricPanel
          canDownloadProfileViews={canDownloadProfileViews}
          id={metricPanelId}
          metric={model.selectedMetric}
          onDownloadProfileViews={actions.onProfileViewsDownload}
          period={model.reporting.period}
        />
        <div className="grid gap-6 xl:h-full xl:grid-rows-[auto_1fr]">
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
