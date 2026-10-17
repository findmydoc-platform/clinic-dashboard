import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { ClinicTreatmentsWorkspace } from "./ClinicTreatmentsWorkspace"
import {
  clinicTreatmentSnapshotFixture,
  createClinicTreatmentCommandsFixture,
} from "./testing/clinic-profile.fixtures"

const meta = {
  component: ClinicTreatmentsWorkspace,
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Treatments Workspace",
  tags: ["domain:clinic-profile", "layer:organism", "status:stable"],
  args: {
    commands: createClinicTreatmentCommandsFixture(),
    snapshot: clinicTreatmentSnapshotFixture,
    management: "interactive",
    onSaved: fn(),
  },
  render: function Fixture(args) {
    const [commands] = useState(() => createClinicTreatmentCommandsFixture())
    return <ClinicTreatmentsWorkspace {...args} commands={commands} />
  },
} satisfies Meta<typeof ClinicTreatmentsWorkspace>
export default meta
type Story = StoryObj<typeof meta>
export const Editable: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", {
        name: `Edit ${clinicTreatmentSnapshotFixture.offerings[0]!.treatment.name}`,
      }),
    )
    const dialog = canvas.getByRole("dialog", { name: "Edit treatment" })
    const price = within(dialog).getByRole("spinbutton", { name: "Price (EUR)" })
    await userEvent.clear(price)
    await userEvent.type(price, "325")
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }))
    await expect(dialog).not.toBeVisible()
    await expect(canvas.getByText("€325.00", { exact: true })).toBeVisible()
  },
}
export const Mobile: Story = { globals: { viewport: { value: "mobile320Short" } } }
export const Dark: Story = { globals: { theme: "dark" } }
export const ReadOnly: Story = { args: { management: "read-only" } }
