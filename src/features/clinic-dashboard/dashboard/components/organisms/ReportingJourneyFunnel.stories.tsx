import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { createDashboardOverview } from "../../dashboard-overview.mapper"
import { clinicDashboardReportingFixture } from "../../testing/clinic-dashboard-reporting.fixtures"
import { dashboardProfileProgressReady } from "../../testing/dashboard.fixtures"
import { ReportingJourneyFunnel } from "./ReportingJourneyFunnel"

const model = createDashboardOverview({
  reporting: { status: "ready", reporting: clinicDashboardReportingFixture },
  periodDays: 30,
  profileProgress: dashboardProfileProgressReady,
  clinicPreview: { status: "unavailable", name: "Controlled clinic" },
  selectedMetricId: "profileViews",
})
const meta = {
  component: ReportingJourneyFunnel,
  args: {
    stages: model.journey,
    session: model.sessionFunnel,
    periodDays: 30,
    selectedId: "profileViews",
    controlsId: "detail-panel",
    onSelect: fn(),
  },
  decorators: [
    (Story) => (
      <>
        <Story />
        <div id="detail-panel" />
      </>
    ),
  ],
  tags: ["domain:dashboard", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Dashboard/Organisms/Reporting Journey Funnel",
} satisfies Meta<typeof ReportingJourneyFunnel>
export default meta
type Story = StoryObj<typeof meta>

export const Available: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const stages = within(canvas.getByRole("list", { name: "Conversion stages" }))
    await expect(stages.getAllByRole("listitem")).toHaveLength(5)
    await expect(stages.getByRole("button", { name: /Profile views 284/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expect(canvas.getByRole("region", { name: "Session conversion summary" })).toHaveTextContent(
      "Profile-view sessions: 200",
    )
    await expect(canvas.getByRole("region", { name: "Session conversion summary" })).toHaveTextContent(
      "Converted sessions: 9",
    )
    await userEvent.click(stages.getByRole("button", { name: /Impressions Not supported yet/ }))
    await expect(args.onSelect).toHaveBeenCalledWith("impressions")
    await userEvent.click(canvas.getByRole("button", { name: "About Profile views to Unique visitors" }))
    const explanation = within(document.body).getByRole("dialog", {
      name: "About Profile views to Unique visitors",
    })
    await expect(explanation).toHaveTextContent("not a measured conversion rate")
    await userEvent.keyboard("{Escape}")
    await expect(canvas.getByRole("button", { name: "About Profile views to Unique visitors" })).toHaveFocus()
  },
}

export const NoQualifyingSessions: Story = {
  args: {
    session: {
      ...model.sessionFunnel,
      profileSessions: "0",
      convertedSessions: "0",
      conversion: undefined,
      comparison: undefined,
      detail: "No qualifying profile-view sessions. Conversion is undefined.",
    },
  },
  play: async ({ canvasElement }) => {
    const summary = within(canvasElement).getByRole("region", { name: "Session conversion summary" })
    await expect(summary).toHaveTextContent("Conversion is undefined")
    await expect(summary).not.toHaveTextContent("%")
  },
}

export const SourceUnavailable: Story = {
  args: {
    session: {
      ...model.sessionFunnel,
      profileSessions: "Not available",
      convertedSessions: "Not available",
      conversion: undefined,
      comparison: undefined,
      detail: "Data source unavailable",
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("region", { name: "Session conversion summary" }),
    ).toHaveTextContent("Data source unavailable")
    await expect(within(canvasElement).getByRole("button", { name: /Inquiries 7/ })).toBeVisible()
  },
}
