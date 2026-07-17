"use client"

import { useCallback, useState } from "react"
import { downloadTextFile } from "@/lib/browser/download-text-file"
import { createDashboardPrototypeViewModel } from "../dashboard.prototype-data.mapper"
import type { DashboardSnapshot } from "../model/dashboard-snapshot"
import type { DashboardLocationSummary } from "../model/dashboard-view-model"
import { createProfileViewsCsvExport } from "../model/profile-views-export"
import type { DashboardReportingPeriod, DashboardSelectableMetricId } from "../model/reporting"

type UseDashboardControllerInput = Readonly<{
  canExportProfileViews: boolean
  initialReportingPeriod: DashboardReportingPeriod
  locationSummary: DashboardLocationSummary
  snapshot: DashboardSnapshot
}>

export function useDashboardController({
  canExportProfileViews,
  initialReportingPeriod,
  locationSummary,
  snapshot,
}: UseDashboardControllerInput) {
  const [reportingPeriod, setReportingPeriod] = useState(initialReportingPeriod)
  const [selectedMetricId, setSelectedMetricId] = useState<DashboardSelectableMetricId>("views")
  const viewModel = createDashboardPrototypeViewModel(
    snapshot,
    reportingPeriod,
    locationSummary,
    selectedMetricId,
  )

  const changeReportingPeriod = useCallback((period: DashboardReportingPeriod) => {
    setReportingPeriod(period)
  }, [])

  const exportProfileViews = useCallback(() => {
    if (!canExportProfileViews) return

    downloadTextFile(createProfileViewsCsvExport(viewModel.reporting.chart.series.views, reportingPeriod))
  }, [canExportProfileViews, reportingPeriod, viewModel.reporting.chart.series.views])

  const selectMetric = useCallback((metricId: DashboardSelectableMetricId) => {
    setSelectedMetricId(metricId)
  }, [])

  return {
    actions: {
      changeReportingPeriod,
      exportProfileViews,
      selectMetric,
    },
    model: {
      reportingPeriod,
      selectedMetricId,
      viewModel,
    },
  } as const
}
