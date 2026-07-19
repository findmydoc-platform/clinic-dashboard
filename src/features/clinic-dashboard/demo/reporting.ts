import {
  createDashboardReportingSnapshot,
  type DashboardProfileTask,
  type DashboardReportingPeriod,
  type DashboardSelectableMetricId,
  type DashboardSnapshot,
} from "@/features/clinic-dashboard/dashboard/public"

const sevenDayDates = [
  { axisLabel: "Jul 13", dateLabel: "July 13" },
  { axisLabel: "Jul 14", dateLabel: "July 14" },
  { axisLabel: "Jul 15", dateLabel: "July 15" },
  { axisLabel: "Jul 16", dateLabel: "July 16" },
  { axisLabel: "Jul 17", dateLabel: "July 17" },
  { axisLabel: "Jul 18", dateLabel: "July 18" },
  { axisLabel: "Jul 19", dateLabel: "July 19" },
] as const

const thirtyDayDates = [
  { axisLabel: "Jun 20", dateLabel: "June 20" },
  { dateLabel: "June 21" },
  { dateLabel: "June 22" },
  { dateLabel: "June 23" },
  { dateLabel: "June 24" },
  { axisLabel: "Jun 25", dateLabel: "June 25" },
  { dateLabel: "June 26" },
  { dateLabel: "June 27" },
  { dateLabel: "June 28" },
  { dateLabel: "June 29" },
  { axisLabel: "Jun 30", dateLabel: "June 30" },
  { dateLabel: "July 1" },
  { dateLabel: "July 2" },
  { dateLabel: "July 3" },
  { dateLabel: "July 4" },
  { axisLabel: "Jul 5", dateLabel: "July 5" },
  { dateLabel: "July 6" },
  { dateLabel: "July 7" },
  { dateLabel: "July 8" },
  { dateLabel: "July 9" },
  { axisLabel: "Jul 10", dateLabel: "July 10" },
  { dateLabel: "July 11" },
  { dateLabel: "July 12" },
  { dateLabel: "July 13" },
  { dateLabel: "July 14" },
  { axisLabel: "Jul 15", dateLabel: "July 15" },
  { dateLabel: "July 16" },
  { dateLabel: "July 17" },
  { dateLabel: "July 18" },
  { axisLabel: "Jul 19", dateLabel: "July 19" },
] as const

const ninetyDayDates = [
  { axisLabel: "Apr 20", dateLabel: "Week of April 20" },
  { dateLabel: "Week of April 27" },
  { axisLabel: "May 4", dateLabel: "Week of May 4" },
  { dateLabel: "Week of May 11" },
  { axisLabel: "May 18", dateLabel: "Week of May 18" },
  { dateLabel: "Week of May 25" },
  { axisLabel: "Jun 1", dateLabel: "Week of June 1" },
  { dateLabel: "Week of June 8" },
  { axisLabel: "Jun 15", dateLabel: "Week of June 15" },
  { dateLabel: "Week of June 22" },
  { axisLabel: "Jun 29", dateLabel: "Week of June 29" },
  { dateLabel: "Week of July 6" },
  { axisLabel: "Jul 13", dateLabel: "Week of July 13" },
] as const

const reportingDates = {
  "7 days": sevenDayDates,
  "30 days": thirtyDayDates,
  "90 days": ninetyDayDates,
} as const

const reportingCadence = {
  "7 days": "daily",
  "30 days": "daily",
  "90 days": "weekly",
} as const

type DemoReportingInput = Readonly<{
  changes: Readonly<Record<Exclude<DashboardSelectableMetricId, "uniqueVisitors">, string>>
  reviewActivity: string
  series: Readonly<Record<DashboardSelectableMetricId, readonly number[]>>
  totals: Readonly<{
    contacts: number
    impressions: number
    inquiries: number
    profileViews: number
    uniqueVisitors: number
  }>
}>

type DemoDashboardInput = Readonly<{
  profileCompletion: number
  profileTasks: readonly DashboardProfileTask[]
  rating: DashboardSnapshot["rating"]
  reporting: Readonly<Record<DashboardReportingPeriod, DemoReportingInput>>
}>

export function createDemoDashboardSnapshot({
  profileCompletion,
  profileTasks,
  rating,
  reporting,
}: DemoDashboardInput): DashboardSnapshot {
  return {
    profileCompletion,
    profileTasks,
    rating,
    reporting: {
      "7 days": createDashboardReportingSnapshot({
        ...reporting["7 days"],
        chart: {
          cadence: reportingCadence["7 days"],
          dates: reportingDates["7 days"],
          series: reporting["7 days"].series,
        },
        period: "7 days",
        profileCompletion,
      }),
      "30 days": createDashboardReportingSnapshot({
        ...reporting["30 days"],
        chart: {
          cadence: reportingCadence["30 days"],
          dates: reportingDates["30 days"],
          series: reporting["30 days"].series,
        },
        period: "30 days",
        profileCompletion,
      }),
      "90 days": createDashboardReportingSnapshot({
        ...reporting["90 days"],
        chart: {
          cadence: reportingCadence["90 days"],
          dates: reportingDates["90 days"],
          series: reporting["90 days"].series,
        },
        period: "90 days",
        profileCompletion,
      }),
    },
  }
}
