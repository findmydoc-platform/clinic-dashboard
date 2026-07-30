import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { clinicTreatmentSnapshotFixture } from "../../testing/clinic-profile.fixtures"
import { ClinicProfileTreatments } from "./ClinicProfileTreatments"

const meta = {
  args: {
    isBusy: false,
    onCreate: fn(),
    onRetry: fn(),
    onTreatmentOpen: fn(),
    showCreateAction: true,
    showTreatmentActions: true,
    showTreatmentViewAction: false,
    status: "ready",
    statusMessage: "",
    treatments: clinicTreatmentSnapshotFixture.offerings,
  },
  component: ClinicProfileTreatments,
  tags: ["domain:clinic-profile", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile Treatments",
} satisfies Meta<typeof ClinicProfileTreatments>

export default meta
type Story = StoryObj<typeof meta>

export const Editing: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const firstTreatment = clinicTreatmentSnapshotFixture.offerings[0]
    const firstTreatmentRow = canvas
      .getByRole("button", { name: `Edit ${firstTreatment.treatment.name}` })
      .closest("div.grid")

    await expect(canvas.getByText("€250.00")).toBeInTheDocument()
    await expect(firstTreatmentRow).not.toBeNull()
    await expect(
      within(firstTreatmentRow as HTMLElement).getByText(firstTreatment.active ? "Active" : "Inactive"),
    ).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: `Edit ${firstTreatment.treatment.name}` }))
    await expect(args.onTreatmentOpen).toHaveBeenCalledWith(firstTreatment)
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
    const treatment = clinicTreatmentSnapshotFixture.offerings[0]

    await expect(canvas.getByText("Laser teeth whitening")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: `View ${treatment.treatment.name}` }))
    await expect(args.onTreatmentOpen).toHaveBeenCalledWith(treatment)
  },
}

export const TemporarilyUnavailable: Story = {
  args: {
    showCreateAction: false,
    showTreatmentActions: false,
    showTreatmentViewAction: false,
    status: "temporarily-unavailable",
    treatments: [],
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Retry" }))
    await expect(args.onRetry).toHaveBeenCalledOnce()
  },
}

export const Forbidden: Story = {
  args: {
    showCreateAction: false,
    showTreatmentActions: false,
    showTreatmentViewAction: false,
    status: "forbidden",
    treatments: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("You do not have permission to view clinic treatments.")).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "New treatment" })).not.toBeInTheDocument()
  },
}
