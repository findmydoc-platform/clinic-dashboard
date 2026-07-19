import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { createDashboardMetricSelection } from "../../model/dashboard-metric-selection"
import { dashboardViewModel } from "../../testing/dashboard.fixtures"
import { DashboardMetricPanel } from "./DashboardMetricPanel"

const meta = {
  component: DashboardMetricPanel,
  tags: ["domain:dashboard", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Organisms/Dashboard Metric Panel",
} satisfies Meta<typeof DashboardMetricPanel>

export default meta
type Story = StoryObj<typeof meta>

const defaultArgs = {
  canDownloadProfileViews: true,
  id: "dashboard-metric-panel",
  metric: dashboardViewModel.selectedMetric,
  onDownloadProfileViews: fn(),
  period: "7 days",
} satisfies Story["args"]

export const DownloadAndChartNavigation: Story = {
  args: defaultArgs,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const chart = canvas.getByRole("group", { name: dashboardViewModel.selectedMetric.description })
    const firstPoint = within(chart).getByRole("img", { name: "October 6: 103 profile views" })

    await userEvent.click(canvas.getByRole("button", { name: "Download profile views" }))
    await expect(args.onDownloadProfileViews).toHaveBeenCalledOnce()
    await userEvent.click(firstPoint)
    await userEvent.keyboard("{ArrowRight}")
    await expect(within(chart).getByRole("img", { name: "October 7: 111 profile views" })).toHaveFocus()
    await expect(canvas.getByLabelText("Profile views, selected metric")).toBeVisible()
  },
}

export const NonDownloadableMetric: Story = {
  args: {
    ...defaultArgs,
    metric: createDashboardMetricSelection(dashboardViewModel.reporting, "impressions"),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByRole("button", { name: "Download profile views" })).not.toBeInTheDocument()
    await expect(canvas.getByRole("heading", { level: 2, name: "Impressions over time" })).toBeVisible()
    await expect(canvas.getByText("Demo data — not live analytics.")).toBeVisible()
  },
}

export const NarrowViewport: Story = {
  args: defaultArgs,
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const chartViewport = canvasElement.querySelector<HTMLElement>("[data-chart-viewport]")

    if (!chartViewport) throw new Error("Expected the responsive dashboard chart viewport")

    await expect(canvas.queryByText("Swipe or scroll to view every date.")).not.toBeInTheDocument()
    await expect(chartViewport.scrollWidth).toBeLessThanOrEqual(chartViewport.clientWidth)
    await expect(canvasElement.querySelectorAll("[data-chart-axis-label]")).toHaveLength(7)
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}
