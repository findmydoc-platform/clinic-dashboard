import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { closedInquiryFixture, inquiryDetailFixtures, spamInquiryFixture } from "../../testing/public"
import { InquiryComposer, type InquiryComposerProps } from "./InquiryComposer"

const defaultActions = {
  onAttachmentRemove: async () => undefined,
  onAttachmentRetry: async () => undefined,
  onAttachmentSelect: async () => undefined,
  onDraftChange: () => undefined,
  onModeChange: () => undefined,
  onSend: async () => undefined,
}

function ComposerHarness(props: InquiryComposerProps) {
  const [draft, setDraft] = useState(props.draft)
  const [mode, setMode] = useState(props.mode)

  return (
    <InquiryComposer {...props} draft={draft} mode={mode} onDraftChange={setDraft} onModeChange={setMode} />
  )
}

const meta = {
  args: {
    ...defaultActions,
    draft: "",
    inquiry: inquiryDetailFixtures.open,
    isMutating: false,
    mode: "reply",
    statusMessage: "",
  },
  component: InquiryComposer,
  parameters: { layout: "fullscreen" },
  tags: ["domain:messages", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Messages/Molecules/Inquiry Composer",
} satisfies Meta<typeof InquiryComposer>

export default meta
type Story = StoryObj<typeof meta>

export const Reply: Story = {
  render: (args) => <ComposerHarness {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox", { name: "Reply to patient" })

    await userEvent.type(input, "We can review these documents.")
    await expect(canvas.getByRole("button", { name: "Send reply" })).toBeEnabled()
    await expect(canvas.getByText("30 / 3,000")).toBeVisible()
  },
}

export const InternalNote: Story = {
  args: { mode: "note" },
  render: (args) => <ComposerHarness {...args} />,
}

export const Guest: Story = {
  args: { inquiry: inquiryDetailFixtures.guest, mode: "note" },
  render: (args) => <ComposerHarness {...args} />,
}

export const Closed: Story = {
  args: { inquiry: closedInquiryFixture, mode: "note" },
  render: (args) => <ComposerHarness {...args} />,
}

export const Spam: Story = {
  args: { inquiry: spamInquiryFixture, mode: "note" },
  render: (args) => <ComposerHarness {...args} />,
}

export const Uploading: Story = {
  args: {
    attachment: {
      fileName: "assessment-photos.pdf",
      mimeType: "application/pdf",
      sizeBytes: 720_000,
      status: "uploading",
    },
  },
}

export const InvalidAttachment: Story = {
  args: {
    attachment: {
      fileName: "records.zip",
      message: "Use a PNG, JPEG, WebP or PDF file.",
      mimeType: "application/zip",
      sizeBytes: 128_000,
      status: "invalid",
    },
  },
}

export const AttachmentOnly: Story = {
  args: {
    attachment: {
      draftId: "draft-attachment-1",
      expiresAt: "2026-08-24T12:00:00.000Z",
      fileName: "assessment-photos.pdf",
      mimeType: "application/pdf",
      sizeBytes: 720_000,
      status: "ready",
    },
  },
}

export const OverLimit: Story = {
  args: { draft: "A".repeat(3_001) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("alert")).toHaveTextContent("Shorten by 1 character")
    await expect(canvas.getByRole("button", { name: "Send reply" })).toBeDisabled()
  },
}
