import type { DashboardJourneyStageId } from "./dashboard-overview"

export const reportingJourneyMeasurementDescription =
  "These measurements describe activity in the selected period. They do not track one linked group of visitors, so they do not provide a measured conversion rate."

export const reportingJourneyTransitionDescriptions: Readonly<
  Record<Exclude<DashboardJourneyStageId, "inquiries">, string>
> = {
  impressions:
    "Your clinic is shown in search results or lists. Opening the clinic profile shows interest beyond seeing the listing.",
  profileViews:
    "One visitor can open the profile more than once. Unique visitors counts each recognizable browser once in the selected period. This is a different way of counting profile visits, not another action.",
  uniqueVisitors: "Interest becomes contact intent when someone starts editing the inquiry form.",
  inquiryStarters:
    "Starting an inquiry does not mean it was sent. The Inquiries total counts successfully submitted and saved requests.",
}
