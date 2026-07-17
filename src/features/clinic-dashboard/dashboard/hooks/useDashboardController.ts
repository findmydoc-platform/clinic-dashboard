"use client"

import { useCallback, useState } from "react"
import { downloadTextFile } from "@/lib/browser/download-text-file"
import { createDashboardPrototypeViewModel } from "../dashboard.prototype-data.mapper"
import type { DashboardSnapshot } from "../model/dashboard-snapshot"
import { createProfileViewsCsvExport } from "../model/profile-views-export"
import type { DashboardReportingPeriod } from "../model/reporting"

type UseDashboardControllerInput = Readonly<{
  canExportProfileViews: boolean
  initialReportingPeriod: DashboardReportingPeriod
  snapshot: DashboardSnapshot
}>

export function useDashboardController({
  canExportProfileViews,
  initialReportingPeriod,
  snapshot,
}: UseDashboardControllerInput) {
  const [reportingPeriod, setReportingPeriod] = useState(initialReportingPeriod)
  const viewModel = createDashboardPrototypeViewModel(snapshot, reportingPeriod)

  const changeReportingPeriod = useCallback((period: DashboardReportingPeriod) => {
    setReportingPeriod(period)
  }, [])

  const exportProfileViews = useCallback(() => {
    if (!canExportProfileViews) return

    downloadTextFile(createProfileViewsCsvExport(viewModel.reporting.chart.points, reportingPeriod))
  }, [canExportProfileViews, reportingPeriod, viewModel.reporting.chart.points])

  return {
    actions: {
      changeReportingPeriod,
      exportProfileViews,
    },
    model: {
      reportingPeriod,
      viewModel,
    },
  } as const
}
