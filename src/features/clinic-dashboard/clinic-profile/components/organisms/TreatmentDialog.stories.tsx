import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { TreatmentDialog } from "./TreatmentDialog"

const treatment = {
  category: "Dentistry",
  description: "A focused whitening treatment for a brighter smile.",
  duration: "45 min",
  id: "whitening",
  name: "Express whitening",
  price: "€180.00",
} as const

const meta = {
  args: {
    initialTreatment: treatment,
    isReadOnly: false,
    onOpenChange: fn(),
    onSave: fn(),
    open: true,
  },
  component: TreatmentDialog,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Treatment Dialog",
} satisfies Meta<typeof TreatmentDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Editable: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Edit treatment" })
    const name = within(dialog).getByRole("textbox", { name: "Treatment name" })

    await userEvent.clear(name)
    await userEvent.type(name, "Advanced whitening")
    await userEvent.click(within(dialog).getByRole("button", { name: "Save treatment changes" }))

    await expect(args.onSave).toHaveBeenCalledWith({
      category: treatment.category,
      description: treatment.description,
      duration: treatment.duration,
      name: "Advanced whitening",
      price: "€180.00",
    })
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
  },
}

export const CreateTreatment: Story = {
  args: { initialTreatment: undefined },
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Create new treatment" })
    const submit = within(dialog).getByRole("button", { name: "Save treatment" })

    await expect(submit).toBeDisabled()
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Treatment name" }),
      "Dental consultation",
    )
    await userEvent.selectOptions(within(dialog).getByRole("combobox", { name: "Category" }), "Dentistry")
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Duration (minutes)" }), "30")
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Price (€)" }), "95,00")
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Description" }),
      "A structured first consultation and treatment recommendation.",
    )
    await userEvent.click(submit)

    await expect(args.onSave).toHaveBeenCalledOnce()
    const savedTreatment = args.onSave.mock.calls[0]?.[0]
    await expect(savedTreatment).toMatchObject({
      category: "Dentistry",
      description: "A structured first consultation and treatment recommendation.",
      duration: "30 min",
      name: "Dental consultation",
      price: "€95.00",
    })
    await expect(savedTreatment).not.toHaveProperty("id")
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
  },
}

export const ReadOnly: Story = {
  args: { isReadOnly: true },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Treatment details" })
    await expect(within(dialog).getByRole("textbox", { name: "Treatment name" })).toBeDisabled()
    await expect(
      within(dialog).queryByRole("button", { name: "Save treatment changes" }),
    ).not.toBeInTheDocument()
    await expect(within(dialog).getByRole("button", { name: "Done" })).toBeEnabled()
  },
}
