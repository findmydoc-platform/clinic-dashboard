import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { ReportingMetricCard } from "./ReportingMetricCard"

const meta = {
  args: {
    comparison: "+12.5% compared with the previous period",
    label: "Profile views",
    value: "284",
  },
  component: ReportingMetricCard,
  tags: ["domain:dashboard", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Dashboard/Molecules/Reporting Metric Card",
} satisfies Meta<typeof ReportingMetricCard>

export default meta
type Story = StoryObj<typeof meta>

export const Available: Story = {}

export const SourceUnavailable: Story = {
  args: { detail: "Data source unavailable", value: "Not available" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Not available")).toBeVisible()
    await expect(canvas.getByText("Data source unavailable")).toBeVisible()
  },
}
