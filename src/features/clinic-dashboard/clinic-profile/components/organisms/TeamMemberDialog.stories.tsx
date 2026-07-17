import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { TeamMemberDialog } from "./TeamMemberDialog"

const member = {
  biography: "Coordinates patient care and clinic operations.",
  id: "anna-schmidt",
  initials: "AS",
  name: "Anna Schmidt",
  specialty: "Clinic management",
} as const

const meta = {
  args: {
    initialMember: member,
    isReadOnly: false,
    onOpenChange: fn(),
    onSave: fn(),
    open: true,
  },
  component: TeamMemberDialog,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Team Member Dialog",
} satisfies Meta<typeof TeamMemberDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Editable: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Edit team member" })
    const firstName = within(dialog).getByRole("textbox", { name: "First name" })

    await userEvent.clear(firstName)
    await userEvent.type(firstName, "Anja")
    await userEvent.click(within(dialog).getByRole("button", { name: "Save team member" }))

    await expect(args.onSave).toHaveBeenCalledWith({
      biography: member.biography,
      initials: "AS",
      name: "Anja Schmidt",
      specialty: member.specialty,
    })
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
  },
}

export const CreateMember: Story = {
  args: { initialMember: undefined },
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Add team member" })
    const submit = within(dialog).getByRole("button", { name: "Add team member" })

    await expect(submit).toBeDisabled()
    await userEvent.type(within(dialog).getByRole("textbox", { name: "First name" }), "Lea")
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Last name" }), "Fischer")
    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: "Specialty / role" }),
      "Patient coordinator",
    )
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Short biography" }),
      "Coordinates international patient journeys.",
    )
    await userEvent.click(submit)

    await expect(args.onSave).toHaveBeenCalledOnce()
    const savedMember = args.onSave.mock.calls[0]?.[0]
    await expect(savedMember).toMatchObject({
      biography: "Coordinates international patient journeys.",
      initials: "LF",
      name: "Lea Fischer",
      specialty: "Patient coordinator",
    })
    await expect(savedMember).not.toHaveProperty("id")
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
  },
}

export const ReadOnly: Story = {
  args: { isReadOnly: true },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Team member details" })
    await expect(within(dialog).getByRole("textbox", { name: "First name" })).toBeDisabled()
    await expect(within(dialog).queryByRole("button", { name: "Save team member" })).not.toBeInTheDocument()
    await expect(within(dialog).getByRole("button", { name: "Done" })).toBeEnabled()
  },
}
