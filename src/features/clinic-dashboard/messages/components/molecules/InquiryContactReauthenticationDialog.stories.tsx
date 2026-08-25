import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import type { InquiryContactReauthentication } from "../../model/inquiry-workspace"
import {
  InquiryContactReauthenticationDialog,
  type InquiryContactReauthenticationDialogProps,
} from "./InquiryContactReauthenticationDialog"

function SuccessfulReauthentication(args: InquiryContactReauthenticationDialogProps) {
  const [reauthentication, setReauthentication] = useState(args.reauthentication)

  return (
    <InquiryContactReauthenticationDialog
      {...args}
      onConfirm={async (password) => {
        await args.onConfirm(password)
        setReauthentication(undefined)
      }}
      reauthentication={reauthentication}
    />
  )
}

const required = {
  message: "Confirm your password to reveal protected contact details.",
  status: "required",
} satisfies InquiryContactReauthentication

const meta = {
  args: {
    isMutating: false,
    onConfirm: fn(async () => undefined),
    onDismiss: fn(),
    reauthentication: required,
  },
  component: InquiryContactReauthenticationDialog,
  parameters: { layout: "fullscreen" },
  tags: ["domain:messages", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Messages/Molecules/Inquiry Contact Reauthentication Dialog",
} satisfies Meta<typeof InquiryContactReauthenticationDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Required: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    await expect(page.getByRole("dialog", { name: "Confirm your identity" })).toBeVisible()
    await expect(page.getByLabelText("Password")).toHaveFocus()
    await expect(page.getByRole("button", { name: "Confirm and reveal" })).toBeDisabled()
  },
}

export const InvalidPassword: Story = {
  args: {
    reauthentication: { message: "That password was not accepted. Try again.", status: "invalid" },
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    await expect(page.getByRole("alert")).toHaveTextContent("That password was not accepted")
    await expect(page.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true")
  },
}

export const TemporarilyUnavailable: Story = {
  args: {
    reauthentication: {
      message: "Identity confirmation is temporarily unavailable. Try again.",
      status: "unavailable",
    },
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.type(page.getByLabelText("Password"), "synthetic-password")
    await expect(page.getByRole("button", { name: "Try again" })).toBeEnabled()
  },
}

export const Success: Story = {
  render: (args) => <SuccessfulReauthentication {...args} />,
  play: async ({ args, canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.type(page.getByLabelText("Password"), "synthetic-password")
    await userEvent.click(page.getByRole("button", { name: "Confirm and reveal" }))
    await expect(args.onConfirm).toHaveBeenCalledWith("synthetic-password")
    await expect(page.queryByRole("dialog", { name: "Confirm your identity" })).not.toBeInTheDocument()
  },
}
