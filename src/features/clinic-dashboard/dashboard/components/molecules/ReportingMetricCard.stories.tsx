import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
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

export const ComparisonExplanation: Story = {
  args: {
    comparison: undefined,
    information:
      "Comparison not yet available. The preceding period does not have complete measurement coverage.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(document.body)
    const trigger = canvas.getByRole("button", { name: "About Profile views" })
    await userEvent.click(trigger)
    await expect(page.getByRole("dialog", { name: "About Profile views" })).toHaveTextContent(
      "Comparison not yet available",
    )
    await userEvent.unhover(trigger)
    await expect(page.getByRole("dialog", { name: "About Profile views" })).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "About Profile views" })).not.toBeInTheDocument(),
    )
  },
}

export const SourceUnavailable: Story = {
  args: { detail: "Data source unavailable", value: "Not available" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Not available")).toBeVisible()
    await expect(canvas.getByText("Data source unavailable")).toBeVisible()
  },
}
