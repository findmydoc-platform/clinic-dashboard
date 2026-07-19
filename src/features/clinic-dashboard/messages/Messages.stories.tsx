import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { messagesFixture } from "./testing/public"
import { Messages } from "./Messages"

const meta = {
  args: {
    isInteractive: true,
    onPatientInquiryOpen: fn(),
    snapshot: messagesFixture,
  },
  component: Messages,
  parameters: { layout: "fullscreen" },
  tags: ["domain:messages", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Messages/Organisms/Messages",
} satisfies Meta<typeof Messages>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
