import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { inquiryQueueFixture } from "../../testing/public"
import { InquiryListItem } from "./InquiryListItem"

const inquiry = inquiryQueueFixture.inquiries[0]
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

export const Processed: Story = {
  args: {
    active: false,
    inquiry: {
      ...inquiry,
      availableTransitions: [],
      status: "closed",
    },
  },
}
