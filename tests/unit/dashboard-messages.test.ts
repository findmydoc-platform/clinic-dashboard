import { describe, expect, it } from "vitest"
import {
  filterConversations,
  getConversationUnreadCount,
  getTotalUnreadCount,
  maximumMessageAttachmentBytes,
  validateMessageAttachment,
  type ClinicConversation,
  type ClinicMessage,
  type MessagesSnapshot,
} from "@/features/clinic-dashboard/messages/model/messages"
import {
  createMessagesState,
  messagesReducer,
  type MessagesState,
} from "@/features/clinic-dashboard/messages/model/messages.reducer"
import { selectMessagesViewModel } from "@/features/clinic-dashboard/messages/model/messages.selectors"
import {
  messagesFixture,
  patientInquiryFixture,
} from "@/features/clinic-dashboard/messages/testing/messages.fixtures"

const createState = () => createMessagesState({ inquiry: patientInquiryFixture, snapshot: messagesFixture })

describe("dashboard message demo", () => {
  const conversations = messagesFixture.conversations

  it("searches patient, doctor, treatment, and optional category metadata", () => {
    expect(filterConversations(conversations, "Markus").map(({ id }) => id)).toEqual(["markus-schmidt"])
    expect(filterConversations(conversations, "Anna Keller").map(({ id }) => id)).toEqual([
      "lukas-weber",
      "markus-schmidt",
    ])

    const categorizedConversation: ClinicConversation = {
      doctor: {
        id: "doctor-orthodontics",
        initials: "OD",
        name: "Dr Olivia Diaz",
        specialty: "Orthodontics",
      },
      id: "clear-aligner",
      initials: "CA",
      name: "Clear Aligner Patient",
      preview: "I have a question about my treatment.",
      section: "New inquiries",
      time: "Now",
      treatment: { categoryPath: ["Orthodontics", "Clear aligner"], name: "Spark Advanced" },
    }

    expect(filterConversations([categorizedConversation], "clear aligner")).toEqual([categorizedConversation])
  })

  it("derives unread totals without mutating the snapshot", () => {
    const activeConversation = conversations.find(({ id }) => id === "lukas-weber")
    expect(activeConversation).toBeDefined()
    expect(getTotalUnreadCount(conversations, [])).toBe(1)
    expect(getConversationUnreadCount(activeConversation!, ["lukas-weber"])).toBe(0)
    expect(activeConversation?.unread).toBe(1)
  })

  it("selects a conversation and closes transient navigation atomically", () => {
    const initialState: MessagesState = {
      ...createState(),
      menuOpen: true,
      selection: { conversationId: "markus-schmidt", mobilePane: "conversation-list" },
    }
    const selected = messagesReducer(
      initialState,
      { conversationId: "lukas-weber", type: "conversationSelected" },
      messagesFixture,
    )

    expect(selected).toMatchObject({
      menuOpen: false,
      readConversationIds: ["lukas-weber"],
      selection: { conversationId: "lukas-weber", mobilePane: "thread" },
    })
    expect(
      messagesReducer(
        initialState,
        { conversationId: "unknown", type: "conversationSelected" },
        messagesFixture,
      ),
    ).toBe(initialState)
  })

  it("accepts only the documented attachment metadata", () => {
    expect(validateMessageAttachment({ name: "photo.webp", size: 10, type: "image/webp" })).toBeUndefined()
    expect(validateMessageAttachment({ name: "record.txt", size: 10, type: "text/plain" })).toBe(
      "Choose a PNG, JPEG, WebP, or PDF file.",
    )
    expect(
      validateMessageAttachment({
        name: "large.pdf",
        size: maximumMessageAttachmentBytes + 1,
        type: "application/pdf",
      }),
    ).toBe("The attachment must be 5 MB or smaller.")
  })

  it("keeps accepted attachment metadata and rejects invalid selections", () => {
    const attachment = { name: "overview.pdf", size: 2_048, type: "application/pdf" }
    const accepted = messagesReducer(
      createState(),
      { attachment, type: "attachmentSelected" },
      messagesFixture,
    )
    expect(accepted.attachment).toEqual(attachment)

    const rejected = messagesReducer(
      accepted,
      { attachment: { ...attachment, type: "text/plain" }, type: "attachmentSelected" },
      messagesFixture,
    )
    expect(rejected.attachment).toBeUndefined()
    expect(rejected.attachmentError).toMatch(/PNG/)
  })

  it("commits a command result and clears draft plus attachment after success", () => {
    const attachment = { name: "overview.pdf", size: 2_048, type: "application/pdf" }
    const drafted = messagesReducer(
      messagesReducer(createState(), { draft: "Local reply", type: "draftChanged" }, messagesFixture),
      { attachment, type: "attachmentSelected" },
      messagesFixture,
    )
    const sending = messagesReducer(drafted, { type: "messageSendStarted" }, messagesFixture)
    const message: ClinicMessage = {
      attachment,
      body: "Local reply",
      id: "local-result",
      sender: "doctor",
      time: "11:08",
    }
    const saved = messagesReducer(sending, { message, type: "messageSendSucceeded" }, messagesFixture)

    expect(saved).toMatchObject({ attachment: undefined, draft: "", isSending: false })
    expect(saved.localMessages).toEqual([message])
    expect(saved.messageStatus).toBe("Demo only — message added locally; nothing was sent.")
  })

  it("preserves authored content when simulated sending fails", () => {
    const drafted = messagesReducer(
      createState(),
      { draft: "Retry this message", type: "draftChanged" },
      messagesFixture,
    )
    const failed = messagesReducer(
      messagesReducer(drafted, { type: "messageSendStarted" }, messagesFixture),
      { type: "messageSendFailed" },
      messagesFixture,
    )

    expect(failed.draft).toBe("Retry this message")
    expect(failed.isSending).toBe(false)
    expect(failed.messageStatus).toMatch(/Try again/)
  })

  it("projects a canonical read-only snapshot without leaking local changes", () => {
    const staleState: MessagesState = {
      ...createState(),
      draft: "Hidden draft",
      inquiryOpen: true,
      localMessages: [{ body: "Hidden", id: "hidden", sender: "doctor", time: "11:08" }],
      menuOpen: true,
      searchQuery: "Markus",
      selection: { conversationId: "markus-schmidt", mobilePane: "thread" },
    }
    const model = selectMessagesViewModel(staleState, messagesFixture, false)

    expect(model).toMatchObject({
      draft: "",
      hasFullConversation: true,
      isInteractive: false,
      searchQuery: "",
      selectedConversation: { id: messagesFixture.activeConversationId },
    })
    expect(model.visibleMessages).toEqual(messagesFixture.messages)
  })

  it("normalizes invalid initial selection and rejects empty conversations", () => {
    const invalidSelectionSnapshot: MessagesSnapshot = {
      ...messagesFixture,
      activeConversationId: "missing-conversation",
    }
    expect(
      createMessagesState({ inquiry: patientInquiryFixture, snapshot: invalidSelectionSnapshot }).selection
        .conversationId,
    ).toBe(conversations[0]?.id)
    expect(() =>
      createMessagesState({
        inquiry: patientInquiryFixture,
        snapshot: { ...invalidSelectionSnapshot, conversations: [] },
      }),
    ).toThrow("Messages require at least one conversation.")
  })
})
