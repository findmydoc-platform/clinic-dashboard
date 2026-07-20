import { useMemo, useRef } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import type { MessageCommands } from "./model/message-commands"
import { messagesFixture, patientInquiryFixture } from "./testing/public"
import { Messages } from "./Messages"

function FailOnceMessages() {
  const attempts = useRef(0)
  const messageCommands = useMemo<MessageCommands>(
    () => ({
      sendMessage: async ({ attachment, body }) => {
        attempts.current += 1
        if (attempts.current === 1) throw new Error("Story-only message failure")

        return {
          attachment,
          body,
          id: "story-retry-message",
          read: "Read 11:08",
          sender: "doctor",
          time: "11:08",
        }
      },
    }),
    [],
  )

  return (
    <Messages
      inquiry={patientInquiryFixture}
      isInteractive
      messageCommands={messageCommands}
      snapshot={messagesFixture}
    />
  )
}

const meta = {
  args: {
    isInteractive: true,
    inquiry: patientInquiryFixture,
    messageCommands: {
      sendMessage: async ({ attachment, body }) => ({
        attachment,
        body,
        id: "story-local-message",
        read: "Read 11:08",
        sender: "doctor" as const,
        time: "11:08",
      }),
    },
    snapshot: messagesFixture,
  },
  component: Messages,
  parameters: { layout: "fullscreen" },
  tags: ["domain:messages", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Messages/Organisms/Messages",
} satisfies Meta<typeof Messages>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: {} }

export const AttachmentFailureAndRetry: Story = {
  render: () => <FailOnceMessages />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const attachmentInput = canvas.getByLabelText("Choose message attachment")
    const file = new File(["demo attachment"], "clinic-overview.pdf", {
      type: "application/pdf",
    })

    await userEvent.upload(attachmentInput, file)
    await expect(canvas.getByText("clinic-overview.pdf")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Remove clinic-overview.pdf" }))
    await expect(canvas.queryByText("clinic-overview.pdf")).not.toBeInTheDocument()

    await userEvent.upload(attachmentInput, file)
    await userEvent.type(canvas.getByRole("textbox", { name: "Write a message" }), "Local demo reply")
    await userEvent.click(canvas.getByRole("button", { name: "Send message" }))
    await expect(await canvas.findByText("The demo message could not be added. Try again.")).toBeVisible()
    await expect(canvas.getByText("clinic-overview.pdf")).toBeVisible()
    await expect(canvas.getByRole("textbox", { name: "Write a message" })).toHaveValue("Local demo reply")

    await userEvent.click(canvas.getByRole("button", { name: "Send message" }))
    await expect(
      await canvas.findByText("Demo only — message added locally; nothing was sent."),
    ).toBeVisible()
    await expect(canvas.getByText("Local demo reply")).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Remove clinic-overview.pdf" })).not.toBeInTheDocument()
    await expect(canvas.getByRole("textbox", { name: "Write a message" })).toHaveValue("")
  },
}

export const InquiryShowsDefinedDetailsOnly: Story = {
  args: { initialInquiryOpen: true },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const dialog = page.getByRole("dialog", { name: "Patient inquiry" })
    await expect(within(dialog).getByText("Interest")).toBeVisible()
    await expect(within(dialog).getByText("Treatment timeline")).toBeVisible()
    await expect(within(dialog).queryByText("Processing status")).not.toBeInTheDocument()
    await expect(within(dialog).queryByText("Revision")).not.toBeInTheDocument()
  },
}

export const InquiryAndComposerAt320Dark: Story = {
  args: { initialInquiryOpen: true },
  globals: {
    theme: "dark",
    viewport: { value: "mobile320Short" },
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    await expect(page.getByRole("dialog", { name: "Patient inquiry" })).toBeVisible()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}
