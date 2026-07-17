import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { clinicProfileFixture } from "../../testing/clinic-profile.fixtures"
import { ClinicProfileTeam } from "./ClinicProfileTeam"

const meta = {
  args: {
    isBusy: false,
    members: clinicProfileFixture.team,
    onCreate: fn(),
    onEdit: fn(),
    onRemove: fn(),
    onUndo: fn(),
    showCreateAction: true,
    showMemberActions: true,
  },
  component: ClinicProfileTeam,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile Team",
} satisfies Meta<typeof ClinicProfileTeam>

export default meta
type Story = StoryObj<typeof meta>

export const Management: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const member = clinicProfileFixture.team[0]
    if (!member) throw new Error("Team fixture requires one member.")

    await userEvent.click(canvas.getByRole("button", { name: `Edit ${member.name}` }))
    await expect(args.onEdit).toHaveBeenCalledWith(member)
    await userEvent.click(canvas.getByRole("button", { name: "Add team member" }))
    await expect(args.onCreate).toHaveBeenCalledOnce()
  },
}

export const UndoAvailable: Story = {
  args: { undoMessage: "Dr Markus Weber removed. Undo restores this item." },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("status")).toHaveTextContent("Dr Markus Weber removed")
    await userEvent.click(canvas.getByRole("button", { name: "Undo removal" }))
    await expect(args.onUndo).toHaveBeenCalledOnce()
  },
}

export const ReadOnlyManagementPreview: Story = {
  args: { showMemberActions: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Add team member" })).toBeEnabled()
    await expect(canvas.queryByRole("button", { name: /Edit Dr/ })).not.toBeInTheDocument()
  },
}
