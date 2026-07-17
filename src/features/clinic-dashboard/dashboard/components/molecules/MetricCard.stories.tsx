import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MetricCard } from "./MetricCard"

const meta = {
  component: MetricCard,
  tags: ["domain:dashboard", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Molecules/Metric Card",
} satisfies Meta<typeof MetricCard>

export default meta
type Story = StoryObj<typeof meta>

export const PositiveTrend: Story = {
  args: {
    metric: {
      delta: "+12.0%",
      id: "views",
      label: "Profile views",
      note: "Opened pages",
      value: "3,284",
    },
  },
}

export const Progress: Story = {
  args: {
    metric: {
      id: "completion",
      label: "Profile completion",
      progress: 82,
      value: "82%",
    },
  },
}
