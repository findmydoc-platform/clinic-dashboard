import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { MessageComposer } from "./MessageComposer"

function ControlledMessageComposer(props: ComponentProps<typeof MessageComposer>) {
  const [draft, setDraft] = useState(props.draft)
  const [attachment, setAttachment] = useState(props.attachment)

  return (
    <MessageComposer
      {...props}
      attachment={attachment}
      draft={draft}
      onAttachmentRemove={() => {
        setAttachment(undefined)
        props.onAttachmentRemove()
      }}
      onAttachmentSelect={(nextAttachment) => {
        setAttachment(nextAttachment)
        props.onAttachmentSelect(nextAttachment)
      }}
      onDraftChange={(nextDraft) => {
        setDraft(nextDraft)
        props.onDraftChange(nextDraft)
      }}
      onSend={async () => {
        await props.onSend()
        setDraft("")
        setAttachment(undefined)
      }}
    />
  )
}

const meta = {
  args: {
    draft: "",
    isSending: false,
    onAttachmentRemove: fn(),
    onAttachmentSelect: fn(),
    onDraftChange: fn(),
    onSend: fn(async () => undefined),
    statusMessage: "",
  },
  component: MessageComposer,
  decorators: [
    (Story) => (
      <div className="w-[42rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]">
        <Story />
      </div>
    ),
  ],
  render: (args) => <ControlledMessageComposer {...args} />,
  tags: ["domain:messages", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Messages/Molecules/Message Composer",
} satisfies Meta<typeof MessageComposer>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const attachment = canvas.getByRole("button", { name: "Attach file" })

    await expect(attachment).toBeEnabled()
    await expect(canvas.getByText(/PNG, JPEG, WebP, or PDF/)).toBeVisible()
  },
}

export const MobileCompact: Story = {
  args: {},
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const composer = canvas.getByLabelText("Write a message")
    const form = composer.closest("form")
    const attachmentInput = canvas.getByLabelText("Choose message attachment")
    if (!form) throw new Error("Message composer form is missing.")

    await expect(attachmentInput).toHaveAttribute("aria-describedby")
    await expect(canvas.getByRole("button", { name: "Use reply template" })).toBeVisible()
    await expect(form.scrollWidth).toBeLessThanOrEqual(form.clientWidth)
  },
}

export const EmojiAndTemplate: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const composer = canvas.getByLabelText("Write a message")

    await userEvent.click(canvas.getByRole("button", { name: "Add smile emoji" }))
    await expect(composer).toHaveValue("🙂")

    await userEvent.click(canvas.getByRole("button", { name: "Use reply template" }))
    await expect(composer).toHaveValue(
      "Thank you for your message. We will review your request and get back to you shortly.",
    )
  },
}

export const SendWithKeyboard: Story = {
  args: {},
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const composer = canvas.getByLabelText("Write a message")
    await userEvent.type(composer, "We can review the photos tomorrow.{enter}")
    await expect(args.onSend).toHaveBeenCalledOnce()
    await expect(composer).toHaveValue("")
  },
}

export const SendWithButton: Story = {
  args: {},
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const composer = canvas.getByLabelText("Write a message")
    await userEvent.type(composer, "We can review the photos tomorrow.")
    await userEvent.click(canvas.getByRole("button", { name: "Send message" }))
    await expect(args.onSend).toHaveBeenCalledOnce()
    await expect(composer).toHaveValue("")
  },
}

export const AttachmentOnly: Story = {
  args: {},
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const file = new File(["demo"], "clinic-overview.pdf", { type: "application/pdf" })

    await userEvent.upload(canvas.getByLabelText("Choose message attachment"), file)
    await expect(canvas.getByText("clinic-overview.pdf")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Send message" }))
    await expect(args.onSend).toHaveBeenCalledOnce()
  },
}
