import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { Button } from "@/components/ui/button"
import { dashboardProfileTasks } from "../../testing/dashboard.fixtures"
import { ProfileTaskDialog } from "./ProfileTaskDialog"

const meta = {
  component: ProfileTaskDialog,
  render: (args) => <ControlledProfileTaskDialog key={args.task.id} {...args} />,
  tags: ["domain:dashboard", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Molecules/Profile Task Dialog",
} satisfies Meta<typeof ProfileTaskDialog>

export default meta
type Story = StoryObj<typeof meta>

function ControlledProfileTaskDialog(props: ComponentProps<typeof ProfileTaskDialog>) {
  const [open, setOpen] = useState(props.open)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open profile task</Button>
      <ProfileTaskDialog
        {...props}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          props.onOpenChange(nextOpen)
        }}
        open={open}
      />
    </>
  )
}

export const WithProfileDestination: Story = {
  args: {
    onOpenChange: fn(),
    onProfileDestinationOpen: fn(),
    open: false,
    task: dashboardProfileTasks[0],
  },
  play: async ({ args, canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const trigger = page.getByRole("button", { name: "Open profile task" })

    await userEvent.click(trigger)
    const dialog = page.getByRole("dialog", { name: "Missing images" })
    await expect(within(dialog).getByLabelText("Status: Open, High priority")).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Open image gallery" }))
    await expect(args.onProfileDestinationOpen).toHaveBeenCalledWith("gallery")
    await userEvent.click(within(dialog).getByText("Close", { selector: "button" }))
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

export const WithoutAvailableDestination: Story = {
  args: {
    onOpenChange: fn(),
    onProfileDestinationOpen: fn(),
    open: false,
    task: dashboardProfileTasks[2],
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(page.getByRole("button", { name: "Open profile task" }))
    const dialog = page.getByRole("dialog", { name: "Certificates required" })
    await expect(
      within(dialog).getByText("Certificate management is not available yet.", { exact: false }),
    ).toBeInTheDocument()
    await expect(within(dialog).queryByRole("button", { name: /Open/ })).not.toBeInTheDocument()
  },
}
