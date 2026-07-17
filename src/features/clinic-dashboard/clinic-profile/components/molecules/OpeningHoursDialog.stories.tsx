import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { OpeningHoursDialog } from "./OpeningHoursDialog"

const meta = {
  args: {
    entries: [
      { days: "Monday–Friday", hours: "08:00–18:00" },
      { days: "Saturday", hours: "09:00–13:00" },
    ],
    onOpenChange: fn(),
    onSave: fn(),
    open: true,
  },
  component: OpeningHoursDialog,
  tags: ["domain:clinic-profile", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Molecules/Opening Hours Dialog",
} satisfies Meta<typeof OpeningHoursDialog>

export default meta
type Story = StoryObj<typeof meta>

export const ApplyChanges: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Edit opening hours" })
    const weekdayHours = within(dialog).getByRole("textbox", { name: "Hours for Monday–Friday" })

    await userEvent.clear(weekdayHours)
    await userEvent.type(weekdayHours, "09:00–17:00")
    await userEvent.click(within(dialog).getByRole("button", { name: "Apply hours" }))

    await expect(args.onSave).toHaveBeenCalledWith([
      { days: "Monday–Friday", hours: "09:00–17:00" },
      { days: "Saturday", hours: "09:00–13:00" },
    ])
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
  },
}
