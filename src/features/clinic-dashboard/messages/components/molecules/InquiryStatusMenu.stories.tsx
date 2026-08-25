import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import type { InquiryHandlingStatus } from "../../model/inquiries"
import { InquiryStatusMenu } from "./InquiryStatusMenu"

type EditableStatus = Exclude<InquiryHandlingStatus, "spam">

function StatusHarness({ initialStatus = "submitted" }: Readonly<{ initialStatus?: EditableStatus }>) {
  const [status, setStatus] = useState<EditableStatus>(initialStatus)
  return (
    <InquiryStatusMenu
      currentStatus={status}
      isDisabled={false}
      isUpdating={false}
      onStatusChange={setStatus}
    />
  )
}

const meta = {
  args: {
    currentStatus: "submitted",
    isDisabled: false,
    isUpdating: false,
    onStatusChange: () => undefined,
  },
  component: InquiryStatusMenu,
  tags: ["domain:messages", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Messages/Molecules/Inquiry Status Menu",
} satisfies Meta<typeof InquiryStatusMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <StatusHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const select = canvas.getByRole("combobox", { name: "Inquiry status" })
    await userEvent.selectOptions(select, "in_review")
    await expect(select).toHaveValue("in_review")
  },
}

export const Updating: Story = { args: { isUpdating: true } }

export const Disabled: Story = { args: { currentStatus: "contacted", isDisabled: true } }

export const ContactedCanReturnToInReview: Story = {
  render: () => <StatusHarness initialStatus="contacted" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const select = canvas.getByRole("combobox", { name: "Inquiry status" })
    await expect(canvas.queryByRole("option", { name: "Submitted" })).not.toBeInTheDocument()
    await userEvent.selectOptions(select, "in_review")
    await expect(select).toHaveValue("in_review")
  },
}
