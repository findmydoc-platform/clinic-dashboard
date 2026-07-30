import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { clinicProfileSourceFixture } from "../../testing/clinic-profile-source.fixtures"
import { OpeningHoursDialog } from "./OpeningHoursDialog"

const meta = {
  args: {
    entries: clinicProfileSourceFixture.published.openingHours,
    errors: {},
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
    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: "Status for Monday" }),
      "closed",
    )
    await userEvent.click(within(dialog).getByRole("button", { name: "Apply hours" }))
    await expect(args.onSave).toHaveBeenCalled()
  },
}

export const NotConfigured: Story = {
  args: { entries: undefined },
}
