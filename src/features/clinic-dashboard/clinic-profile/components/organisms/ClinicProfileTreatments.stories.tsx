import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { clinicProfileFixture } from "../../testing/clinic-profile.fixtures"
import { ClinicProfileTreatments } from "./ClinicProfileTreatments"

const meta = {
  args: {
    isBusy: false,
    onCreate: fn(),
    onMove: fn(),
    onRemove: fn(),
    onTreatmentOpen: fn(),
    onUndo: fn(),
    showCreateAction: true,
    showTreatmentActions: true,
    showTreatmentViewAction: false,
    treatments: clinicProfileFixture.treatments,
  },
  component: ClinicProfileTreatments,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile Treatments",
} satisfies Meta<typeof ClinicProfileTreatments>

export default meta
type Story = StoryObj<typeof meta>

export const Reordering: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const firstTreatment = clinicProfileFixture.treatments[0]
    if (!firstTreatment) throw new Error("Treatment fixture requires one treatment.")

    await expect(canvas.getByRole("button", { name: `Move ${firstTreatment.name} up` })).toBeDisabled()
    await userEvent.click(canvas.getByRole("button", { name: `Move ${firstTreatment.name} down` }))
    await expect(args.onMove).toHaveBeenCalledWith(firstTreatment.id, 1)
  },
}

export const UndoAvailable: Story = {
  args: { undoMessage: "Laser teeth whitening removed. Undo restores this item." },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Undo removal" }))
    await expect(args.onUndo).toHaveBeenCalledOnce()
  },
}

export const MobileReadOnly: Story = {
  args: {
    showCreateAction: false,
    showTreatmentActions: false,
    showTreatmentViewAction: true,
  },
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const treatment = clinicProfileFixture.treatments[0]
    if (!treatment) throw new Error("Treatment fixture requires one treatment.")

    await expect(canvas.getByText("Laser teeth whitening")).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: /Move Laser teeth whitening/ })).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: `View ${treatment.name}` }))
    await expect(args.onTreatmentOpen).toHaveBeenCalledWith(treatment)
  },
}
