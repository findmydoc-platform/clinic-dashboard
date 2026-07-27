import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { InquiryStatusMenu } from "./InquiryStatusMenu"

function ControlledInquiryStatusMenu() {
  const [open, setOpen] = useState(false)

  return (
    <InquiryStatusMenu
      availableTransitions={["in_review", "contacted", "closed", "spam"]}
      currentStatus="submitted"
      isDisabled={false}
      isUpdating={false}
      onOpenChange={setOpen}
      onStatusChange={() => setOpen(false)}
      open={open}
    />
  )
}

function PendingInquiryStatusMenu() {
  const [open, setOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  return (
    <InquiryStatusMenu
      availableTransitions={["in_review", "contacted", "closed", "spam"]}
      currentStatus="submitted"
      isDisabled={updating}
      isUpdating={updating}
      onOpenChange={setOpen}
      onStatusChange={() => {
        setOpen(false)
        setUpdating(true)
      }}
      open={open}
    />
  )
}

const meta = {
  args: {
    availableTransitions: ["in_review", "contacted", "closed", "spam"],
    currentStatus: "submitted",
    isDisabled: false,
    isUpdating: false,
    onOpenChange: () => undefined,
    onStatusChange: () => undefined,
    open: false,
  },
  component: InquiryStatusMenu,
  render: () => <ControlledInquiryStatusMenu />,
  tags: ["domain:messages", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Messages/Molecules/Inquiry Status Menu",
} satisfies Meta<typeof InquiryStatusMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = { args: {} }

export const Updating: Story = {
  render: (args) => <InquiryStatusMenu {...args} isDisabled isUpdating />,
}

export const FocusPreservedWhenUpdateStarts: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", {
      name: "Change inquiry status. Current status: Submitted",
    })

    trigger.focus()
    await userEvent.keyboard("{Enter}")
    await userEvent.click(await page.findByRole("menuitem", { name: "In review" }))

    await expect(trigger).toHaveFocus()
    await expect(trigger).toHaveAttribute("aria-busy", "true")
    await expect(trigger).toHaveAttribute("aria-disabled", "true")
  },
  render: () => <PendingInquiryStatusMenu />,
}

export const Terminal: Story = {
  render: (args) => <InquiryStatusMenu {...args} availableTransitions={[]} currentStatus="closed" />,
}
