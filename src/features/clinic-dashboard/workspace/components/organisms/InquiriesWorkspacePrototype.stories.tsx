import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { InquiriesWorkspacePrototype } from "./InquiriesWorkspacePrototype"

const meta = {
  component: InquiriesWorkspacePrototype,
  parameters: { layout: "fullscreen" },
  tags: ["domain:workspace", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Organisms/Inquiries Workspace Prototype",
} satisfies Meta<typeof InquiriesWorkspacePrototype>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
