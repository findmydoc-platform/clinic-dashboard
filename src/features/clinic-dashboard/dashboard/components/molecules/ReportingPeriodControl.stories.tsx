import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { ReportingPeriodControl } from "./ReportingPeriodControl"

const meta = {
  args: { onValueChange: fn(), value: 30 },
  component: ReportingPeriodControl,
  tags: ["domain:dashboard", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Dashboard/Molecules/Reporting Period Control",
} satisfies Meta<typeof ReportingPeriodControl>

export default meta
type Story = StoryObj<typeof meta>

export const SelectedPeriod: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("button", { name: "30 days" })).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(canvas.getByRole("button", { name: "7 days" }))
    await expect(args.onValueChange).toHaveBeenCalledWith(7)
  },
}
