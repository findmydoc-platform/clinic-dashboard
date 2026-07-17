import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { dashboardViewModel } from "../../testing/dashboard.fixtures"
import { ProfileViewsPanel } from "./ProfileViewsPanel"

const meta = {
  component: ProfileViewsPanel,
  tags: ["domain:dashboard", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Organisms/Profile Views Panel",
} satisfies Meta<typeof ProfileViewsPanel>

export default meta
type Story = StoryObj<typeof meta>

const defaultArgs = {
  canDownload: true,
  chart: dashboardViewModel.reporting.chart,
  onDownload: fn(),
  period: "7 days",
} satisfies Story["args"]

export const DownloadAndChartNavigation: Story = {
  args: defaultArgs,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const chart = canvas.getByRole("group", { name: dashboardViewModel.reporting.chart.description })
    const firstPoint = within(chart).getByRole("img", { name: "October 6: 103 profile views" })

    await userEvent.click(canvas.getByRole("button", { name: "Download profile views" }))
    await expect(args.onDownload).toHaveBeenCalledOnce()
    await userEvent.click(firstPoint)
    await userEvent.keyboard("{ArrowRight}")
    await expect(within(chart).getByRole("img", { name: "October 7: 111 profile views" })).toHaveFocus()
    await expect(canvas.getByText("4,680")).toBeInTheDocument()
  },
}

export const ReadOnly: Story = {
  args: { ...defaultArgs, canDownload: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByRole("button", { name: "Download profile views" })).not.toBeInTheDocument()
    await expect(
      canvas.getByRole("heading", { level: 2, name: "Profile views over time" }),
    ).toBeInTheDocument()
  },
}

export const NarrowViewport: Story = {
  ...ReadOnly,
  globals: { viewport: { value: "mobile320Short" } },
}
