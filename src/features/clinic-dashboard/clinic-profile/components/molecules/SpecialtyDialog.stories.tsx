import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { SpecialtyDialog } from "./SpecialtyDialog"

const meta = {
  args: {
    existing: ["Dentistry", "Dermatology"],
    onAdd: fn(),
    onOpenChange: fn(),
    open: true,
  },
  component: SpecialtyDialog,
  tags: ["domain:clinic-profile", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Molecules/Specialty Dialog",
} satisfies Meta<typeof SpecialtyDialog>

export default meta
type Story = StoryObj<typeof meta>

export const AddAvailableSpecialty: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Add specialty" })
    const submit = within(dialog).getByRole("button", { name: "Add specialty" })

    await expect(submit).toBeDisabled()
    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: "Specialty" }),
      "Aesthetic medicine",
    )
    await expect(submit).toBeEnabled()
    await userEvent.click(submit)

    await expect(args.onAdd).toHaveBeenCalledWith("Aesthetic medicine")
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
  },
}
