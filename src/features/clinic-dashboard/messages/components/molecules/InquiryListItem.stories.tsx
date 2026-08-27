import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { inquiryQueueFixture } from "../../testing/public"
import { InquiryListItem } from "./InquiryListItem"

const inquiry = inquiryQueueFixture.status === "ready" ? inquiryQueueFixture.inquiries[0] : undefined
if (!inquiry) throw new Error("The inquiry list item story requires an inquiry.")

const meta = {
  args: {
    active: true,
    inquiry,
    onSelect: () => undefined,
  },
  component: InquiryListItem,
  tags: ["domain:messages", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Messages/Molecules/Inquiry List Item",
} satisfies Meta<typeof InquiryListItem>

export default meta
type Story = StoryObj<typeof meta>

export const Active: Story = { args: {} }

export const Closed: Story = {
  args: {
    active: false,
    inquiry: { ...inquiry, lifecycle: "closed" },
  },
}

export const Guest: Story = {
  args: {
    active: false,
    inquiry: {
      ...inquiry,
      conversation: { kind: "guest" },
      patient: { initials: "GI", kind: "guest", name: "Guest inquiry" },
    },
  },
}

export const Spam: Story = {
  args: {
    active: false,
    inquiry: { ...inquiry, handlingStatus: "spam", lifecycle: "closed" },
  },
}

export const InternalNotePreview: Story = {
  args: {
    active: false,
    inquiry: {
      ...inquiry,
      lastActivityPreview: "Review treatment fit now.",
      latestActivityKind: "internal-note",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Internal note")).toBeVisible()
    await expect(canvas.getByText("Review treatment fit now.")).toBeVisible()
  },
}
