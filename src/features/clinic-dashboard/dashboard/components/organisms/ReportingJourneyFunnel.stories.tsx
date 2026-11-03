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
    await expect(canvas.queryByRole("region", { name: "Session conversion summary" })).not.toBeInTheDocument()
    await expect(canvas.queryByText(/Profile-view sessions|Converted sessions/)).not.toBeInTheDocument()
    await userEvent.click(stages.getByRole("button", { name: /Impressions Not available/ }))
    await expect(args.onSelect).toHaveBeenCalledWith("impressions")
    for (const [transition, meaning] of [
      ["Impressions to Profile views", "interest beyond seeing the listing"],
      ["Profile views to Unique visitors", "not another action"],
      ["Unique visitors to Inquiry starters", "starts editing the inquiry form"],
      ["Inquiry starters to Inquiries", "successfully submitted and saved requests"],
    ]) {
      const trigger = canvas.getByRole("button", { name: `About ${transition}` })
      await userEvent.click(trigger)
      const explanation = within(document.body).getByRole("dialog", { name: `About ${transition}` })
      await expect(explanation).toHaveTextContent(meaning)
      await userEvent.keyboard("{Escape}")
      await expect(trigger).toHaveFocus()
    }
    await userEvent.click(canvas.getByRole("button", { name: "About Journey measurements" }))
    await expect(
      within(document.body).getByRole("dialog", { name: "About Journey measurements" }),
    ).toHaveTextContent("do not track one linked group of visitors")
    await userEvent.keyboard("{Escape}")
  },
}
