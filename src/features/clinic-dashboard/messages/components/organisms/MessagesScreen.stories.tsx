import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { MessagesScreen } from "./MessagesScreen"
import type { MessagesScreenActions, MessagesViewModel } from "../../model/messages"
import { messagesFixture } from "../../testing/messages.fixtures"

const selectedConversation = messagesFixture.conversations[0]

const actions = {
  onConversationSelect: fn(),
  onDraftChange: fn(),
  onMenuOpenChange: fn(),
  onMessageSend: fn(),
  onMobileBack: fn(),
  onPatientInquiryOpen: fn(),
  onSearchQueryChange: fn(),
  onUnreadToggle: fn(),
} satisfies MessagesScreenActions

const model = {
  dateLabel: messagesFixture.dateLabel,
  draft: "",
  hasFullConversation: true,
  isInteractive: true,
  menuOpen: false,
  mobileThreadOpen: true,
  searchQuery: "",
  sections: [
    {
      conversations: [
        {
          conversation: selectedConversation,
          isActive: true,
          unreadCount: 1,
        },
      ],
      name: "New inquiries",
    },
    {
      conversations: messagesFixture.conversations.slice(1).map((conversation) => ({
        conversation,
        isActive: false,
        unreadCount: 0,
      })),
      name: "Recent chats",
    },
  ],
  selectedConversation,
  selectedUnreadCount: 1,
  totalConversationCount: messagesFixture.conversations.length,
  totalUnreadCount: 1,
  visibleMessages: messagesFixture.messages,
} satisfies MessagesViewModel

const meta = {
  args: { actions, model },
  component: MessagesScreen,
  parameters: { layout: "fullscreen" },
  tags: ["domain:messages", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Messages/Organisms/Messages Screen",
} satisfies Meta<typeof MessagesScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 1, name: "Messages" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "View patient inquiry" }))
    await expect(args.actions.onPatientInquiryOpen).toHaveBeenCalledOnce()
  },
}

export const ReadOnly: Story = {
  args: {
    model: {
      ...model,
      isInteractive: false,
      mobileThreadOpen: false,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByLabelText("Write a message")).not.toBeInTheDocument()
    await expect(canvas.queryByLabelText("Search conversations")).not.toBeInTheDocument()
  },
}
