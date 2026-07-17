import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { dashboardViewModel } from "../../testing/dashboard.fixtures"
import { ProfileViewsChart } from "./ProfileViewsChart"

const meta = {
  component: ProfileViewsChart,
  tags: ["domain:dashboard", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Molecules/Profile Views Chart",
} satisfies Meta<typeof ProfileViewsChart>

export default meta
type Story = StoryObj<typeof meta>

export const KeyboardAndPointerNavigation: Story = {
  args: {
    description: dashboardViewModel.reporting.chart.description,
    points: dashboardViewModel.reporting.chart.points,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const chart = canvas.getByRole("group", { name: dashboardViewModel.reporting.chart.description })
    const firstPoint = within(chart).getByRole("img", { name: "October 6: 103 profile views" })

    await userEvent.hover(firstPoint)
    await expect(
      within(chart).getByRole("tooltip", { name: "October 6: 103 profile views" }),
    ).toBeInTheDocument()
    await userEvent.click(firstPoint)
    await expect(firstPoint).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(within(chart).getByRole("img", { name: "October 7: 111 profile views" })).toHaveFocus()
  },
}
