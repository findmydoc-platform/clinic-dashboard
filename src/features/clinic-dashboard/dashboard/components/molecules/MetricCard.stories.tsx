import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
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

export const SelectedMetric: Story = {
  args: {
    metric: profileViewsMetric,
    selection: {
      controlsId: "metric-panel",
      isSelected: true,
      metricId: "views",
      onSelect: fn(),
    },
  },
  render: (args) => (
    <div>
      <MetricCard {...args} />
      <div id="metric-panel" />
    </div>
  ),
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: /Profile views/i })

    await expect(button).toHaveAttribute("aria-controls", "metric-panel")
    await expect(button).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(button)
    await expect(args.selection?.onSelect).toHaveBeenCalledWith("views")
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText("Profile completion").closest("button")).toBeNull()
  },
}
