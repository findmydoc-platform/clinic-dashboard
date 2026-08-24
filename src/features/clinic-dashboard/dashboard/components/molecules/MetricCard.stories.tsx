import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { MetricCard } from "./MetricCard"

const meta = {
  component: MetricCard,
  tags: ["domain:dashboard", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Molecules/Metric Card",
} satisfies Meta<typeof MetricCard>

export default meta
type Story = StoryObj<typeof meta>

const profileViewsMetric = {
  delta: "+12.0%",
  id: "views",
  label: "Profile views",
  note: "Opened pages",
  value: "3,284",
} as const

export const PositiveTrend: Story = {
  args: {
    metric: profileViewsMetric,
  },
}

export const InformationalMetric: Story = {
  args: {
    metric: profileViewsMetric,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText("Profile views").closest("button")).toBeNull()
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument()
  },
}

export const Progress: Story = {
  args: {
    metric: {
      id: "completion",
      label: "Public profile completion",
      progress: 67,
      value: "67%",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText("Public profile completion").closest("button")).toBeNull()
  },
}
