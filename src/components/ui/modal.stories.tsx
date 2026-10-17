import { useRef, useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { Button } from "./button"
import { Modal } from "./modal"

function ControlledModal(props: ComponentProps<typeof Modal>) {
  const [open, setOpen] = useState(props.open)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)} ref={triggerRef}>
        Open dialog
      </Button>
      <Modal
        {...props}
        onOpenChange={(nextOpen) => {
          props.onOpenChange(nextOpen)
          setOpen(nextOpen)
        }}
        open={open}
        triggerRef={triggerRef}
      />
    </div>
  )
}

const meta = {
  args: {
    children: "Dialog content",
    description: "A focused task with explicit dismissal.",
    footer: <Button>Save</Button>,
    onOpenChange: fn(),
    open: false,
    title: "Example dialog",
  },
  component: Modal,
  parameters: { layout: "fullscreen" },
  render: (args) => <ControlledModal {...args} />,
  tags: ["domain:shared", "layer:molecule", "status:stable"],
  title: "Shared/Molecules/Modal",
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Open dialog" }))
    await expect(canvas.getByRole("dialog", { name: "Example dialog" })).toBeInTheDocument()
  },
}

export const Open: Story = {
  args: { open: true },
}

export const ConfirmationRole: Story = {
  args: { role: "alertdialog", title: "Confirm departure" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Open dialog" })
    await userEvent.click(trigger)
    expect(canvas.getByRole("alertdialog", { name: "Confirm departure" })).toBeVisible()
    await userEvent.keyboard("{Escape}")
    expect(canvas.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  },
}
