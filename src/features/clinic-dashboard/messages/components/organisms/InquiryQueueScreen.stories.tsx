import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { createInquiryQueueState } from "../../model/inquiry-queue.reducer"
import { selectInquiryQueueViewModel } from "../../model/inquiry-queue.selectors"
import { inquiryQueueFixture } from "../../testing/public"
import { InquiryQueueScreen } from "./InquiryQueueScreen"

const actions = {
  onInquirySelect: () => undefined,
  onMobileBack: () => undefined,
  onSearchQueryChange: () => undefined,
  onStatusChange: async () => undefined,
  onStatusMenuOpenChange: () => undefined,
}

const meta = {
  args: {
    actions,
    model: selectInquiryQueueViewModel(createInquiryQueueState(inquiryQueueFixture.inquiries), "ready"),
  },
  component: InquiryQueueScreen,
  globals: { viewport: { value: "desktop1440" } },
  parameters: { layout: "fullscreen" },
  tags: ["domain:messages", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Messages/Organisms/Inquiry Queue Screen",
} satisfies Meta<typeof InquiryQueueScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: {} }

export const Unavailable: Story = {
  args: {
    model: selectInquiryQueueViewModel(createInquiryQueueState([]), "temporarily-unavailable"),
  },
}
