import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { fn } from "storybook/test"
import {
  clinicGallerySnapshotFixture,
  createClinicGalleryCommandsFixture,
} from "./testing/clinic-profile.fixtures"
import { ClinicGalleryWorkspace } from "./ClinicGalleryWorkspace"

const meta = {
  component: ClinicGalleryWorkspace,
  args: {
    commands: createClinicGalleryCommandsFixture(),
    management: "interactive",
    snapshot: clinicGallerySnapshotFixture,
    status: "ready",
    onSaved: fn(),
    onNavigationRequestChange: fn(),
    onContextNavigationRequestChange: fn(),
  },
  parameters: { layout: "fullscreen" },
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Gallery Workspace",
} satisfies Meta<typeof ClinicGalleryWorkspace>
export default meta
type Story = StoryObj<typeof meta>
export const Ready: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Manage gallery" }))
    await expect(canvas.getByRole("region", { name: "Manage gallery" })).toBeVisible()
    await expect(canvas.queryByRole("heading", { name: "Treatments" })).not.toBeInTheDocument()
  },
}
export const Empty: Story = { args: { snapshot: { ...clinicGallerySnapshotFixture, items: [] } } }
export const ReadOnly: Story = { args: { management: "read-only" } }
