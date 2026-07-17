import type { DashboardChartPoint, DashboardReportingPeriod } from "./reporting"

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

export function serializeProfileViewsCsv(points: readonly DashboardChartPoint[]) {
  return [["date", "profileViews"], ...points.map((point) => [point.dateLabel, String(point.value)])]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n")
}

export function createProfileViewsCsvFilename(period: DashboardReportingPeriod) {
  return `profile-views-${period.replaceAll(" ", "-")}.csv`
}

export function createProfileViewsCsvExport(
  points: readonly DashboardChartPoint[],
  period: DashboardReportingPeriod,
) {
  return {
    content: serializeProfileViewsCsv(points),
    fileName: createProfileViewsCsvFilename(period),
    mimeType: "text/csv",
  } as const
}
