import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { AddressDialog } from "./AddressDialog"

const meta = {
  args: {
    address: {
      cityId: "city-istanbul",
      houseNumber: "195",
      street: "Büyükdere Avenue",
      zipCode: "34394",
    },
    cities: [
      { id: "city-istanbul", name: "Istanbul" },
      { id: "city-ankara", name: "Ankara" },
    ],
    errors: {},
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
    await userEvent.type(street, "Bağdat Avenue")
    await userEvent.click(within(dialog).getByRole("button", { name: "Apply address" }))
    await expect(args.onSave).toHaveBeenCalledWith({ ...args.address, street: "Bağdat Avenue" })
  },
}

export const ValidationErrors: Story = {
  args: {
    errors: {
      "address.cityId": "Select a city.",
      "address.zipCode": "Enter the postal code.",
    },
  },
}
