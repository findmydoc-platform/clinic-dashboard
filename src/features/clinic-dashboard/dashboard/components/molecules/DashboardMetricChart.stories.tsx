import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { dashboardViewModel } from "../../testing/dashboard.fixtures"
import { DashboardMetricChart } from "./DashboardMetricChart"

const meta = {
  component: DashboardMetricChart,
  tags: ["domain:dashboard", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Molecules/Dashboard Metric Chart",
} satisfies Meta<typeof DashboardMetricChart>

export default meta
type Story = StoryObj<typeof meta>

export const KeyboardAndPointerNavigation: Story = {
  args: {
    description: dashboardViewModel.selectedMetric.description,
    points: dashboardViewModel.selectedMetric.points,
    valueLabel: dashboardViewModel.selectedMetric.valueLabel,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const chart = canvas.getByRole("group", { name: dashboardViewModel.selectedMetric.description })
    const firstPoint = within(chart).getByRole("img", { name: "October 6: 103 profile views" })

    await userEvent.hover(firstPoint)
    await expect(
      within(chart).getByRole("tooltip", { name: "October 6: 103 profile views" }),
    ).toBeInTheDocument()
    await userEvent.click(firstPoint)
    await expect(firstPoint).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(within(chart).getByRole("img", { name: "October 7: 111 profile views" })).toHaveFocus()
    await userEvent.keyboard("{End}")
    await expect(within(chart).getByRole("img", { name: "October 12: 134 profile views" })).toHaveFocus()
  },
}
