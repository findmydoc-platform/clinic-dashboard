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
    valueLabels: dashboardViewModel.selectedMetric.valueLabels,
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

export const SingularContactValue: Story = {
  args: {
    description: "Daily contacts total 1. Deterministic prototype data; not live analytics.",
    points: [{ axisLabel: "Today", dateLabel: "Today", value: 1 }],
    valueLabels: { plural: "contacts", singular: "contact" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const point = canvas.getByRole("img", { name: "Today: 1 contact" })

    await userEvent.hover(point)
    await expect(canvas.getByRole("tooltip", { name: "Today: 1 contact" })).toBeInTheDocument()
  },
}
