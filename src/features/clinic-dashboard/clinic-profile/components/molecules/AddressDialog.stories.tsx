import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { AddressDialog } from "./AddressDialog"

const meta = {
  args: {
    address: {
      city: "Berlin",
      phone: "+49 30 5550 0100",
      postalCode: "10117",
      street: "Friedrichstraße 100",
    },
    onOpenChange: fn(),
    onSave: fn(),
    open: true,
  },
  component: AddressDialog,
  tags: ["domain:clinic-profile", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Molecules/Address Dialog",
} satisfies Meta<typeof AddressDialog>

export default meta
type Story = StoryObj<typeof meta>

export const ApplyChanges: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Edit address" })
    const street = within(dialog).getByRole("textbox", { name: "Street" })

    await userEvent.clear(street)
    await userEvent.type(street, "Alexanderplatz 1")
    await userEvent.click(within(dialog).getByRole("button", { name: "Apply address" }))

    await expect(args.onSave).toHaveBeenCalledWith({
      ...args.address,
      street: "Alexanderplatz 1",
    })
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
  },
}

export const CancelChanges: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Edit address" })
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Street" }), " changed")
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await expect(args.onSave).not.toHaveBeenCalled()
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
  },
}
