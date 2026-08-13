import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { clinicTreatmentSnapshotFixture } from "../../testing/clinic-profile.fixtures"
import { TreatmentDialog } from "./TreatmentDialog"

const treatment = clinicTreatmentSnapshotFixture.offerings[0]
const availableTreatments = [clinicTreatmentSnapshotFixture.catalogue[3]] as const

const meta = {
  args: {
    availableTreatments,
    initialTreatment: treatment,
    isBusy: false,
    isReadOnly: false,
    message: "",
    onOpenChange: fn(),
    onSave: fn(async () => true),
    onTreatmentMissing: fn(),
    open: true,
  },
  component: TreatmentDialog,
  tags: ["domain:clinic-profile", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Treatment Dialog",
} satisfies Meta<typeof TreatmentDialog>

export default meta
type Story = StoryObj<typeof meta>

export const EditableTreatment: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Edit treatment" })
    await expect(within(dialog).getByRole("textbox", { name: "Treatment" })).toHaveAttribute("readonly")
    await expect(within(dialog).getByText(treatment.treatment.descriptionText)).toBeInTheDocument()

    const price = within(dialog).getByRole("spinbutton", { name: "Price (EUR)" })
    await userEvent.clear(price)
    await userEvent.type(price, "275.25")
    await userEvent.click(within(dialog).getByRole("checkbox", { name: "Publicly active" }))
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }))

    await expect(args.onSave).toHaveBeenCalledWith({
      active: false,
      price: 275.25,
      treatmentId: treatment.treatment.id,
    })
  },
}

export const AddTreatmentInactiveByDefault: Story = {
  args: { initialTreatment: undefined },
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Add treatment" })
    const submit = within(dialog).getByRole("button", { name: "Add treatment" })

    await expect(submit).toBeDisabled()
    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: "Treatment" }),
      availableTreatments[0].id,
    )
    await expect(within(dialog).getByText(availableTreatments[0].descriptionText)).toBeInTheDocument()
    await userEvent.type(within(dialog).getByRole("spinbutton", { name: "Price (EUR)" }), "0")
    await userEvent.click(submit)

    await expect(args.onSave).toHaveBeenCalledWith({
      active: false,
      price: 0,
      treatmentId: availableTreatments[0].id,
    })
  },
}

export const ReadOnly: Story = {
  args: { isReadOnly: true },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Treatment details" })
    await expect(within(dialog).getByRole("spinbutton", { name: "Price (EUR)" })).toHaveAttribute("readonly")
    await expect(within(dialog).getByRole("checkbox", { name: "Publicly active" })).toBeDisabled()
    await expect(within(dialog).getByRole("button", { name: "Done" })).toBeEnabled()
  },
}

export const SaveFailure: Story = {
  args: {
    message: "Treatment changes could not be saved. Try again.",
  },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Edit treatment" })
    await expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Treatment changes could not be saved. Try again.",
    )
  },
}

export const InvalidPrice: Story = {
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Edit treatment" })
    const price = within(dialog).getByRole("spinbutton", { name: "Price (EUR)" })
    await userEvent.clear(price)
    await userEvent.type(price, "12.345")
    await expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Enter a non-negative EUR price with at most two decimal places.",
    )
    await expect(price).toHaveAttribute("aria-invalid", "true")
  },
}

export const MobileAddTreatment: Story = {
  args: { initialTreatment: undefined },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Add treatment" })
    const missingTreatment = within(dialog).getByRole("button", { name: "Treatment missing?" })
    const cancel = within(dialog).getByRole("button", { name: "Cancel" })

    expect(missingTreatment.getBoundingClientRect().top).toBeLessThan(cancel.getBoundingClientRect().top)
    missingTreatment.focus()
    await userEvent.tab()
    await expect(cancel).toHaveFocus()
  },
}

export const DarkAddTreatment: Story = {
  args: { initialTreatment: undefined },
  globals: { theme: "dark" },
}
