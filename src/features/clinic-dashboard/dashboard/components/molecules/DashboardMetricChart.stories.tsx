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
    description: "Daily contacts total 1. Deterministic demo data; not live analytics.",
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

const thirtyDayAxisLabels = new Map([
  [0, "Sep 13"],
  [9, "Sep 22"],
  [19, "Oct 2"],
  [29, "Oct 12"],
])
const thirtyDayProfileViewPoints = Array.from({ length: 30 }, (_, index) => {
  const axisLabel = thirtyDayAxisLabels.get(index)

  return {
    ...(axisLabel ? { axisLabel } : {}),
    dateLabel: `Reporting day ${index + 1}`,
    value: 94 + index + ((index * 7) % 11),
  }
})

export const ThirtyDaysAtAGlance: Story = {
  args: {
    description: "Daily profile views across a selected 30-day prototype reporting period.",
    points: thirtyDayProfileViewPoints,
    valueLabels: { plural: "profile views", singular: "profile view" },
  },
  play: async ({ canvasElement }) => {
    const chartViewport = canvasElement.querySelector<HTMLElement>("[data-chart-viewport]")
    const axisLabels = Array.from(canvasElement.querySelectorAll<SVGTextElement>("[data-chart-axis-label]"))

    if (!chartViewport) throw new Error("Expected the responsive dashboard chart viewport")

    const viewportBounds = chartViewport.getBoundingClientRect()

    await expect(axisLabels).toHaveLength(4)
    await expect(chartViewport.scrollWidth).toBeLessThanOrEqual(chartViewport.clientWidth)

    for (const axisLabel of axisLabels) {
      const labelBounds = axisLabel.getBoundingClientRect()

      await expect(labelBounds.left).toBeGreaterThanOrEqual(viewportBounds.left - 0.5)
      await expect(labelBounds.right).toBeLessThanOrEqual(viewportBounds.right + 0.5)
    }
  },
}
