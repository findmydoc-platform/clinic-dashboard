import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { TreatmentDialog } from "./TreatmentDialog"

const treatment = {
  masterTreatmentId: "master-laser-teeth-whitening",
  name: "Laser teeth whitening",
  price: "€250",
} as const

const availableTreatments = [{ id: "master-hair-transplant", name: "Hair transplant" }] as const

const meta = {
  args: {
    availableTreatments,
    initialTreatment: treatment,
    isReadOnly: false,
    onOpenChange: fn(),
    onSave: fn(() => true),
    onTreatmentMissing: fn(),
    open: true,
  },
  component: TreatmentDialog,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Treatment Dialog",
} satisfies Meta<typeof TreatmentDialog>

export default meta
type Story = StoryObj<typeof meta>

export const EditablePrice: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Edit clinic price" })
    await expect(within(dialog).getByRole("textbox", { name: "Treatment" })).toHaveAttribute("readonly")
    await expect(within(dialog).queryByRole("combobox")).not.toBeInTheDocument()

    const price = within(dialog).getByRole("textbox", { name: "Price" })
    const save = within(dialog).getByRole("button", { name: "Save price" })
    await expect(save).toBeDisabled()
    await userEvent.clear(price)
    await userEvent.type(price, "  €250  ")
    await expect(save).toBeDisabled()
    await userEvent.clear(price)
    await userEvent.type(price, "€275")
    await userEvent.click(save)

    await expect(args.onSave).toHaveBeenCalledWith({
      masterTreatmentId: treatment.masterTreatmentId,
      price: "€275",
    })
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
  },
}

export const AddTreatment: Story = {
  args: { initialTreatment: undefined },
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Add treatment" })
    const submit = within(dialog).getByRole("button", { name: "Add treatment" })

    await expect(submit).toBeDisabled()
    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: "Treatment" }),
      "master-hair-transplant",
    )
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Price" }), "€3,900")
    await userEvent.click(submit)

    await expect(args.onSave).toHaveBeenCalledWith({
      masterTreatmentId: "master-hair-transplant",
      price: "€3,900",
    })
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
  },
}

export const MissingTreatmentHandoff: Story = {
  args: { initialTreatment: undefined },
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Add treatment" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Treatment missing?" }))

    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
    await expect(args.onTreatmentMissing).toHaveBeenCalledOnce()
    await expect(args.onSave).not.toHaveBeenCalled()
  },
}

export const ReadOnly: Story = {
  args: { isReadOnly: true },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Treatment details" })
    await expect(within(dialog).getByRole("textbox", { name: "Treatment" })).toHaveAttribute("readonly")
    await expect(within(dialog).getByRole("textbox", { name: "Price" })).toHaveAttribute("readonly")
    await expect(within(dialog).queryByRole("button", { name: "Save price" })).not.toBeInTheDocument()
    await expect(within(dialog).getByRole("button", { name: "Done" })).toBeEnabled()
  },
}

export const MobileAddTreatment: Story = {
  args: { initialTreatment: undefined },
  globals: { viewport: { value: "mobile320Short" } },
}

export const DarkAddTreatment: Story = {
  args: { initialTreatment: undefined },
  globals: { theme: "dark" },
}
