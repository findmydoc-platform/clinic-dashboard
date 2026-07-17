import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { dashboardViewModel } from "../../testing/dashboard.fixtures"
import { ConversionFunnel } from "./ConversionFunnel"

const meta = {
  component: ConversionFunnel,
  tags: ["domain:dashboard", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Organisms/Conversion Funnel",
} satisfies Meta<typeof ConversionFunnel>

export default meta
type Story = StoryObj<typeof meta>

export const SevenDayJourney: Story = {
  args: {
    period: "7 days",
    steps: dashboardViewModel.reporting.funnel,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole("heading", { level: 2, name: "Conversion funnel (7 days)" }),
    ).toBeInTheDocument()
    await expect(canvas.getByText("Process optimization active")).toBeInTheDocument()
    await expect(canvas.getByText("41.7% of contacts")).toBeInTheDocument()
    await expect(canvas.getByText("Inquiries")).toBeInTheDocument()
  },
}

export const NarrowViewport: Story = {
  ...SevenDayJourney,
  globals: { viewport: { value: "mobile320Short" } },
}
