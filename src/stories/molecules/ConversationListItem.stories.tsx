import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { ConversationListItem } from "@/components/molecules/ConversationListItem"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"

const activeConversation = clinicDashboardFixture.messages.conversations[0]

const meta = {
  args: {
    active: true,
    conversation: activeConversation,
    interactive: true,
    onSelect: fn(),
    unreadCount: 1,
  },
  component: ConversationListItem,
  decorators: [
    (Story) => (
      <div className="w-96 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]">
        <Story />
      </div>
    ),
  ],
  parameters: {
    a11y: { test: "error" },
    layout: "centered",
  },
  tags: ["autodocs", "layer:molecule", "domain:clinic-dashboard"],
  title: "Clinic Dashboard/Molecules/Conversation List Item",
} satisfies Meta<typeof ConversationListItem>

export default meta
type Story = StoryObj<typeof meta>

export const ActiveUnread: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    await expect(args.onSelect).toHaveBeenCalledOnce()
  },
}

export const ReadOnly: Story = {
  args: {
    active: false,
    interactive: false,
    unreadCount: 0,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument()
    await expect(canvas.getByText("Hair transplant")).toBeInTheDocument()
  },
}
