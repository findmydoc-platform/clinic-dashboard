import { describe, expect, it } from "vitest"
import {
  createLocalClinicMessage,
  filterConversations,
  getConversationUnreadCount,
  getTotalUnreadCount,
  type ClinicConversation,
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

describe("dashboard message prototype", () => {
  const conversations = messagesFixture.conversations

  it("searches existing patient, treatment, and optional category metadata", () => {
    expect(filterConversations(conversations, "Markus").map(({ id }) => id)).toEqual(["markus-schmidt"])
    expect(filterConversations(conversations, "hair transplant").map(({ id }) => id)).toEqual(["lukas-weber"])

    const categorizedConversation: ClinicConversation = {
      id: "clear-aligner",
      initials: "CA",
      name: "Clear Aligner Patient",
      preview: "I have a question about my treatment.",
      section: "New inquiries",
      time: "Now",
      treatment: {
        categoryPath: ["Orthodontics", "Clear aligner"],
        name: "Spark Advanced",
      },
    }

    expect(filterConversations([categorizedConversation], "orthodontics")).toEqual([categorizedConversation])
    expect(filterConversations([categorizedConversation], "spark advanced")).toEqual([
      categorizedConversation,
    ])
  })

  it("derives unread totals without mutating fixture conversations", () => {
    const activeConversation = conversations.find(({ id }) => id === "lukas-weber")
    expect(activeConversation).toBeDefined()
    expect(getTotalUnreadCount(conversations, [])).toBe(1)
    expect(getConversationUnreadCount(activeConversation!, [])).toBe(1)
    expect(getConversationUnreadCount(activeConversation!, ["lukas-weber"])).toBe(0)
    expect(getTotalUnreadCount(conversations, ["lukas-weber"])).toBe(0)
    expect(activeConversation?.unread).toBe(1)
  })

  it("creates a deterministic local clinic message from a controlled draft", () => {
    expect(createLocalClinicMessage("  We can review this tomorrow.  ", 2)).toEqual({
      body: "We can review this tomorrow.",
      id: "local-message-2",
      read: "Read 11:08",
      sender: "clinic",
      time: "11:08",
    })
  })

  it("selects a conversation through one atomic transition", () => {
    const initialState: MessagesState = {
      ...createMessagesState(messagesFixture),
      menuOpen: true,
      selection: {
        conversationId: "markus-schmidt",
        mobilePane: "conversation-list",
      },
    }

    const nextState = messagesReducer(
      initialState,
      { conversationId: "lukas-weber", type: "conversationSelected" },
      messagesFixture,
    )

    expect(nextState).toMatchObject({
      menuOpen: false,
      readConversationIds: ["lukas-weber"],
      selection: {
        conversationId: "lukas-weber",
        mobilePane: "thread",
      },
    })
    expect(initialState).toMatchObject({
      menuOpen: true,
      readConversationIds: [],
      selection: {
        conversationId: "markus-schmidt",
        mobilePane: "conversation-list",
      },
    })

    const inboxState = messagesReducer(
      { ...nextState, menuOpen: true },
      { type: "mobileInboxRequested" },
      messagesFixture,
    )
    expect(inboxState).toMatchObject({
      menuOpen: false,
      selection: {
        conversationId: "lukas-weber",
        mobilePane: "conversation-list",
      },
    })
  })

  it("rejects selection transitions for unknown conversations", () => {
    const state = createMessagesState(messagesFixture)

    expect(
      messagesReducer(
        state,
        { conversationId: "missing-conversation", type: "conversationSelected" },
        messagesFixture,
      ),
    ).toBe(state)
  })

  it("closes the transient menu when interaction is withdrawn without losing authored state", () => {
    const state: MessagesState = {
      ...createMessagesState(messagesFixture),
      draft: "Preserved draft",
      menuOpen: true,
      searchQuery: "Markus",
      selection: {
        conversationId: "markus-schmidt",
        mobilePane: "thread",
      },
    }

    const withdrawn = messagesReducer(state, { type: "interaction-withdrawn" }, messagesFixture)

    expect(withdrawn).toEqual({ ...state, menuOpen: false })
    expect(messagesReducer(withdrawn, { type: "interaction-withdrawn" }, messagesFixture)).toBe(withdrawn)
  })

  it("toggles unread state without duplicating conversation ids", () => {
    const state = createMessagesState(messagesFixture)
    const readState = messagesReducer(state, { type: "unreadToggled" }, messagesFixture)
    const unreadState = messagesReducer(readState, { type: "unreadToggled" }, messagesFixture)

    expect(readState.readConversationIds).toEqual(["lukas-weber"])
    expect(unreadState.readConversationIds).toEqual([])
  })

  it("submits messages only for the full conversation and clears the draft atomically", () => {
    const data = messagesFixture
    const draftedState = messagesReducer(
      createMessagesState(data),
      { draft: "We can review this tomorrow.", type: "draftChanged" },
      data,
    )
    const previewState = messagesReducer(
      draftedState,
      { conversationId: "markus-schmidt", type: "conversationSelected" },
      data,
    )

    expect(
      messagesReducer(
        previewState,
        { message: "We can review this tomorrow.", type: "messageSubmitted" },
        data,
      ),
    ).toBe(previewState)

    const activeState = messagesReducer(
      previewState,
      { conversationId: data.activeConversationId, type: "conversationSelected" },
      data,
    )
    const submittedState = messagesReducer(
      activeState,
      { message: "We can review this tomorrow.", type: "messageSubmitted" },
      data,
    )

    expect(submittedState.draft).toBe("")
    expect(submittedState.localMessages).toEqual([
      {
        body: "We can review this tomorrow.",
        id: "local-message-1",
        read: "Read 11:08",
        sender: "clinic",
        time: "11:08",
      },
    ])
  })

  it("uses the explicit submitted payload even when the controlled draft is empty", () => {
    const initialState = createMessagesState(messagesFixture)

    expect(initialState.draft).toBe("")
    expect(messagesReducer(initialState, { message: "   ", type: "messageSubmitted" }, messagesFixture)).toBe(
      initialState,
    )

    const submittedState = messagesReducer(
      initialState,
      { message: "  Payload wins over hidden draft state.  ", type: "messageSubmitted" },
      messagesFixture,
    )

    expect(submittedState.draft).toBe("")
    expect(submittedState.localMessages).toEqual([
      {
        body: "Payload wins over hidden draft state.",
        id: "local-message-1",
        read: "Read 11:08",
        sender: "clinic",
        time: "11:08",
      },
    ])
  })

  it("derives the complete render model without storing filtered or counted state", () => {
    const data = messagesFixture
    const selectedState = messagesReducer(
      createMessagesState(data),
      { conversationId: "markus-schmidt", type: "conversationSelected" },
      data,
    )
    const searchedState = messagesReducer(
      { ...selectedState, menuOpen: true },
      { query: "Markus", type: "searchQueryChanged" },
      data,
    )

    const interactiveModel = selectMessagesViewModel(searchedState, data, true)
    const presentationModel = selectMessagesViewModel(searchedState, data, false)

    expect(interactiveModel).toMatchObject({
      hasFullConversation: false,
      menuOpen: true,
      mobileThreadOpen: true,
      selectedConversation: { id: "markus-schmidt" },
      totalConversationCount: 1,
      totalUnreadCount: 1,
      visibleMessages: [],
    })
    expect(interactiveModel.sections.flatMap(({ conversations: items }) => items)).toHaveLength(1)
    expect(presentationModel).toMatchObject({
      draft: "",
      hasFullConversation: true,
      menuOpen: false,
      mobileThreadOpen: false,
      searchQuery: "",
      selectedConversation: { id: data.activeConversationId },
      totalConversationCount: data.conversations.length,
      totalUnreadCount: 1,
      visibleMessages: data.messages,
    })
    expect(presentationModel.sections.flatMap(({ conversations: items }) => items)).toHaveLength(
      data.conversations.length,
    )
  })

  it("projects a canonical snapshot when interaction is withdrawn", () => {
    const data = messagesFixture
    const staleState: MessagesState = {
      draft: "Hidden draft",
      localMessages: [createLocalClinicMessage("Hidden local message", 1)],
      menuOpen: true,
      readConversationIds: [data.activeConversationId],
      searchQuery: "Markus",
      selection: {
        conversationId: "markus-schmidt",
        mobilePane: "thread",
      },
    }

    const projection = selectMessagesViewModel(staleState, data, false)

    expect(projection).toMatchObject({
      draft: "",
      hasFullConversation: true,
      isInteractive: false,
      menuOpen: false,
      mobileThreadOpen: false,
      searchQuery: "",
      selectedConversation: { id: data.activeConversationId },
      totalConversationCount: data.conversations.length,
      totalUnreadCount: 1,
    })
    expect(projection.visibleMessages).toEqual(data.messages)
    expect(projection.visibleMessages).not.toContainEqual(staleState.localMessages[0])
  })

  it("normalizes an invalid initial selection and rejects an empty conversation source", () => {
    const invalidSelectionSnapshot: MessagesSnapshot = {
      ...messagesFixture,
      activeConversationId: "missing-conversation",
    }
    const normalizedState = createMessagesState(invalidSelectionSnapshot)
    expect(normalizedState.selection.conversationId).toBe(conversations[0]?.id)

    expect(() =>
      createMessagesState({
        ...invalidSelectionSnapshot,
        conversations: [],
      }),
    ).toThrow("Messages require at least one conversation.")
  })

  it("keeps the fixture treatment-first without inventing category levels", () => {
    const activeConversation = conversations.find(({ id }) => id === "lukas-weber")
    expect(activeConversation?.treatment).toEqual({ name: "Hair transplant" })
  })

  it("keeps fixture identities and active-conversation references consistent", () => {
    const { activeConversationId, messages } = messagesFixture
    const activeConversations = conversations.filter(({ id }) => id === activeConversationId)

    expect(activeConversations).toHaveLength(1)
    expect(activeConversations[0]?.name).toBe(patientInquiryFixture.name)
    expect(new Set(conversations.map(({ id }) => id)).size).toBe(conversations.length)
    expect(new Set(messages.map(({ id }) => id)).size).toBe(messages.length)
  })
})
