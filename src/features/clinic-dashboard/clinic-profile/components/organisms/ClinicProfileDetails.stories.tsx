import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { clinicProfileSourceFixture } from "../../testing/clinic-profile-source.fixtures"
import { ClinicProfileDetails } from "./ClinicProfileDetails"

const meta = {
  args: {
    address: clinicProfileSourceFixture.published.address,
    errors: {},
    isEditing: false,
    onAddressEdit: fn(),
    onOpeningHoursEdit: fn(),
    openingHours: clinicProfileSourceFixture.published.openingHours,
  },
  component: ClinicProfileDetails,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile Details",
} satisfies Meta<typeof ClinicProfileDetails>

export default meta
type Story = StoryObj<typeof meta>

export const PublishedReadView: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument()
    await expect(canvas.getByText("Türkiye")).toBeVisible()
  },
}

export const EditMode: Story = {
  args: { isEditing: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const buttons = canvas.getAllByRole("button", { name: "Edit" })
    await userEvent.click(buttons[0]!)
    await expect(args.onAddressEdit).toHaveBeenCalledOnce()
  },
}
