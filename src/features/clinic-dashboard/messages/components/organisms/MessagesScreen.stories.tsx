import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Button } from "@/components/ui/button"
import { MessagesScreen } from "./MessagesScreen"
import { useMessagesController } from "../../hooks/useMessagesController"
import type { MessageCommands } from "../../model/message-commands"
import type { MessagesScreenActions } from "../../model/messages"
import { createMessagesState } from "../../model/messages.reducer"
import { selectMessagesViewModel } from "../../model/messages.selectors"
import { messagesFixture, patientInquiryFixture } from "../../testing/messages.fixtures"

const messageCommands: MessageCommands = {
  sendMessage: async ({ attachment, body }) => ({
    attachment,
    body,
    id: "screen-story-message",
    read: "Read 11:08",
    sender: "doctor",
    time: "11:08",
  }),
}

function createStoryActions(): MessagesScreenActions {
  return {
    onAttachmentRemove: () => undefined,
    onAttachmentSelect: () => undefined,
    onConversationSelect: () => undefined,
    onDraftChange: () => undefined,
    onMenuOpenChange: () => undefined,
    onMessageSend: async () => undefined,
    onMobileBack: () => undefined,
    onPatientInquiryOpen: () => undefined,
    onSearchQueryChange: () => undefined,
    onUnreadToggle: () => undefined,
  }
}

function createStoryModel(isInteractive: boolean) {
  return selectMessagesViewModel(
    createMessagesState({ inquiry: patientInquiryFixture, snapshot: messagesFixture }),
    messagesFixture,
    isInteractive,
  )
}

function ControlledMessagesScreen({ model: initialModel }: ComponentProps<typeof MessagesScreen>) {
  const { actions, model } = useMessagesController({
    inquiry: patientInquiryFixture,
    isInteractive: initialModel.isInteractive,
    messageCommands,
    snapshot: messagesFixture,
  })
  const [patientInquiryOpened, setPatientInquiryOpened] = useState(false)

  return (
    <>
      <MessagesScreen
        actions={{
          ...actions,
          onPatientInquiryOpen: () => setPatientInquiryOpened(true),
        }}
        model={model}
      />
      <p aria-label="Patient inquiry harness state" className="sr-only" role="status">
        {patientInquiryOpened ? "Patient inquiry opened" : "Patient inquiry closed"}
      </p>
    </>
  )
}

function CapabilityToggleMessagesScreen() {
  const [isInteractive, setIsInteractive] = useState(true)
  const { actions, model } = useMessagesController({
    inquiry: patientInquiryFixture,
    isInteractive,
    messageCommands,
    snapshot: messagesFixture,
  })

  return (
    <>
      <Button onClick={() => setIsInteractive((current) => !current)}>
        {isInteractive ? "Disable messaging" : "Enable messaging"}
      </Button>
      <MessagesScreen actions={{ ...actions, onPatientInquiryOpen: () => undefined }} model={model} />
    </>
  )
}

const meta = {
  args: {
    actions: createStoryActions(),
    model: createStoryModel(true),
  },
  component: MessagesScreen,
  globals: { viewport: { value: "desktop1280" } },
  parameters: { layout: "fullscreen" },
  render: (args) => <ControlledMessagesScreen {...args} />,
  tags: ["domain:messages", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Messages/Organisms/Messages Screen",
} satisfies Meta<typeof MessagesScreen>

export default meta
type Story = StoryObj<typeof meta>

export const ConversationSelection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const conversation = canvas.getByRole("button", { name: /Markus Schmidt/ })

    await userEvent.click(conversation)

    await expect(conversation).toHaveAttribute("aria-current", "page")
    await expect(
      canvas.getByRole("region", { name: "Conversation between Markus Schmidt and Dr Anna Keller" }),
    ).toBeVisible()
    await expect(canvas.getByRole("heading", { level: 2, name: "Markus Schmidt" })).toBeVisible()
    await expect(canvas.getByRole("heading", { name: "Conversation preview" })).toBeVisible()
  },
}

export const MobileThreadKeepsLatestMessageVisible: Story = {
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    const thread = canvas.getByRole("region", {
      name: "Conversation between Lukas Weber and Dr Anna Keller",
    })
    const messageLog = within(thread).getByRole("log", {
      name: "Messages between Lukas Weber and Dr Anna Keller",
    })

    await expect(within(thread).getByRole("heading", { level: 2, name: "Lukas Weber" })).toBeVisible()
    await expect(within(thread).getByRole("button", { name: "View patient inquiry" })).toBeVisible()
    await expect(within(thread).getByText("Hair restoration")).not.toBeVisible()
    await waitFor(() => expect(messageLog.scrollHeight).toBeGreaterThan(messageLog.clientHeight))
    await waitFor(() =>
      expect(messageLog.scrollTop).toBeGreaterThanOrEqual(
        messageLog.scrollHeight - messageLog.clientHeight - 1,
      ),
    )
    await expect(thread.scrollWidth).toBeLessThanOrEqual(thread.clientWidth)
  },
}

export const ConversationSearch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const search = canvas.getByRole("searchbox", { name: "Search conversations" })

    await userEvent.type(search, "Sarah Meyer")

    await expect(search).toHaveValue("Sarah Meyer")
    await expect(canvas.getByRole("button", { name: /Sarah Meyer/ })).toBeVisible()
    await expect(canvas.queryByRole("button", { name: /Lukas Weber/ })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: /Markus Schmidt/ })).not.toBeInTheDocument()
  },
}

export const MessageSending: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const composer = canvas.getByRole("textbox", { name: "Write a message" })
    const message = "We can review the photos tomorrow."

    await userEvent.type(composer, message)
    await userEvent.click(canvas.getByRole("button", { name: "Send message" }))

    await expect(composer).toHaveValue("")
    await expect(
      within(canvas.getByRole("log", { name: "Messages between Lukas Weber and Dr Anna Keller" })).getByText(
        message,
      ),
    ).toBeVisible()
  },
}

export const UnreadFilter: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const menuTrigger = canvas.getByRole("button", { name: "Conversation menu" })

    await expect(canvas.getByLabelText("1 unread message")).toBeVisible()
    await userEvent.click(menuTrigger)
    const markAsRead = await page.findByRole("menuitem", { name: "Mark as read" })
    await userEvent.click(markAsRead)

    await expect(canvas.getByText("All read")).toBeVisible()
    await expect(canvas.queryByLabelText("1 unread message")).not.toBeInTheDocument()

    await userEvent.click(menuTrigger)
    await expect(await page.findByRole("menuitem", { name: "Mark as unread" })).toBeVisible()
  },
}

export const MobileBackToConversations: Story = {
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const selectedConversation = canvas.getByRole("button", { name: /Lukas Weber/ })

    await userEvent.click(selectedConversation)
    await expect(
      canvas.getByRole("region", { name: "Conversation between Lukas Weber and Dr Anna Keller" }),
    ).toBeVisible()

    await userEvent.click(canvas.getByRole("button", { name: "Back to conversations" }))

    await expect(canvas.getByRole("searchbox", { name: "Search conversations" })).toBeVisible()
    await waitFor(() => expect(selectedConversation).toHaveFocus())
  },
}

export const PatientInquiryAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const state = canvas.getByRole("status", { name: "Patient inquiry harness state" })

    await expect(state).toHaveTextContent("Patient inquiry closed")
    await userEvent.click(canvas.getByRole("button", { name: "View patient inquiry" }))
    await expect(state).toHaveTextContent("Patient inquiry opened")
  },
}

export const ReadOnly: Story = {
  args: {
    model: createStoryModel(false),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByLabelText("Write a message")).not.toBeInTheDocument()
    await expect(canvas.queryByLabelText("Search conversations")).not.toBeInTheDocument()
  },
}

export const CapabilityWithdrawalProjectsSnapshot: Story = {
  render: () => <CapabilityToggleMessagesScreen />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const preservedDraft = "This draft must survive the capability roundtrip."

    await userEvent.type(canvas.getByRole("textbox", { name: "Write a message" }), preservedDraft)
    await userEvent.type(canvas.getByRole("searchbox", { name: "Search conversations" }), "Markus")
    await userEvent.click(canvas.getByRole("button", { name: /Markus Schmidt/ }))

    await userEvent.click(canvas.getByRole("button", { name: "Disable messaging" }))

    const enableMessaging = canvas.getByRole("button", { name: "Enable messaging" })
    await expect(enableMessaging).toHaveFocus()
    await expect(canvas.queryByRole("searchbox", { name: "Search conversations" })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("textbox", { name: "Write a message" })).not.toBeInTheDocument()
    await expect(
      canvas.getByRole("region", { name: "Conversation between Lukas Weber and Dr Anna Keller" }),
    ).toBeVisible()
    await expect(canvas.getByText("Markus Schmidt")).toBeVisible()
    await expect(canvas.queryByRole("button", { name: /Markus Schmidt/ })).not.toBeInTheDocument()

    await userEvent.click(enableMessaging)

    const search = canvas.getByRole("searchbox", { name: "Search conversations" })
    await expect(search).toHaveValue("Markus")
    await expect(
      canvas.getByRole("region", { name: "Conversation between Markus Schmidt and Dr Anna Keller" }),
    ).toBeVisible()
    await userEvent.clear(search)
    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    await expect(canvas.getByRole("textbox", { name: "Write a message" })).toHaveValue(preservedDraft)

    await userEvent.click(canvas.getByRole("button", { name: "Conversation menu" }))
    await expect(await page.findByRole("menuitem", { name: "Mark as unread" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Disable messaging" }))
    await expect(page.queryByRole("menuitem", { name: "Mark as unread" })).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Enable messaging" }))

    await expect(page.queryByRole("menuitem", { name: "Mark as unread" })).not.toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Conversation menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    await expect(canvas.getByRole("textbox", { name: "Write a message" })).toHaveValue(preservedDraft)
  },
}
