import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { clinicProfileFixture } from "../../testing/clinic-profile.fixtures"
import { ClinicProfileDetails } from "./ClinicProfileDetails"

const meta = {
  args: {
    address: clinicProfileFixture.address,
    isEditingDisabled: false,
    onAddressEdit: fn(),
    onOpeningHoursEdit: fn(),
    openingHours: clinicProfileFixture.openingHours,
    showEditActions: true,
  },
  component: ClinicProfileDetails,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile Details",
} satisfies Meta<typeof ClinicProfileDetails>

export default meta
type Story = StoryObj<typeof meta>

export const Editable: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const addressCard = canvas.getByRole("heading", { name: "Address" }).closest("section")
    if (!addressCard) throw new Error("Address card is missing.")

    await userEvent.click(within(addressCard).getByRole("button", { name: "Edit" }))
    await expect(args.onAddressEdit).toHaveBeenCalledOnce()
    await userEvent.click(canvas.getByRole("button", { name: "Adjust map and address" }))
    await expect(args.onAddressEdit).toHaveBeenCalledTimes(2)
  },
}

export const ReadOnly: Story = {
  args: { isEditingDisabled: true, showEditActions: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Adjust map and address" })).toBeDisabled()
  },
}
