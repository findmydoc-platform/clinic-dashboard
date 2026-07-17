import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { MessageComposer } from "@/components/molecules/MessageComposer"

function ControlledMessageComposer(props: ComponentProps<typeof MessageComposer>) {
  const [draft, setDraft] = useState(props.draft)

  return (
    <MessageComposer
      draft={draft}
      onDraftChange={(nextDraft) => {
        setDraft(nextDraft)
        props.onDraftChange(nextDraft)
      }}
      onSend={(message) => {
        props.onSend(message)
        setDraft("")
      }}
    />
  )
}

const meta = {
  args: {
    draft: "",
    onDraftChange: fn(),
    onSend: fn(),
  },
  component: MessageComposer,
  decorators: [
    (Story) => (
      <div className="w-[42rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]">
        <Story />
      </div>
    ),
  ],
  parameters: {
    a11y: { test: "error" },
    layout: "centered",
  },
  render: (args) => <ControlledMessageComposer {...args} />,
  tags: ["autodocs", "layer:molecule", "domain:clinic-dashboard"],
  title: "Clinic Dashboard/Molecules/Message Composer",
} satisfies Meta<typeof MessageComposer>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const attachment = canvas.getByRole("button", {
      name: "Attach file, unavailable in this prototype",
    })

    await expect(attachment).toBeDisabled()
    await expect(canvas.getByText("Attachments are not available in this prototype.")).toBeVisible()
  },
}

export const EmojiAndTemplate: Story = {
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
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const composer = canvas.getByLabelText("Write a message")
    await userEvent.type(composer, "We can review the photos tomorrow.{enter}")
    await expect(args.onSend).toHaveBeenCalledWith("We can review the photos tomorrow.")
    await expect(composer).toHaveValue("")
  },
}

export const SendWithButton: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const composer = canvas.getByLabelText("Write a message")
    await userEvent.type(composer, "We can review the photos tomorrow.")
    await userEvent.click(canvas.getByRole("button", { name: "Send message" }))
    await expect(args.onSend).toHaveBeenCalledWith("We can review the photos tomorrow.")
    await expect(composer).toHaveValue("")
  },
}
