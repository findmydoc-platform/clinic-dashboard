import {
  createLocalClinicMessage,
  getConversationUnreadCount,
  type ClinicMessage,
  type MessagesData,
} from "./messages"

export type MessagesSelection = Readonly<{
  conversationId: string
  mobilePane: "conversation-list" | "thread"
}>

export type MessagesState = Readonly<{
  draft: string
  localMessages: readonly ClinicMessage[]
  menuOpen: boolean
  readConversationIds: readonly string[]
  searchQuery: string
  selection: MessagesSelection
}>

export type MessagesAction =
  | Readonly<{ conversationId: string; type: "conversationSelected" }>
  | Readonly<{ draft: string; type: "draftChanged" }>
  | Readonly<{ open: boolean; type: "menuOpenChanged" }>
  | Readonly<{ message: string; type: "messageSubmitted" }>
  | Readonly<{ type: "mobileInboxRequested" }>
  | Readonly<{ query: string; type: "searchQueryChanged" }>
  | Readonly<{ type: "unreadToggled" }>

function requireInitialConversation(data: MessagesData) {
  const conversation =
    data.conversations.find(({ id }) => id === data.activeConversationId) ?? data.conversations[0]

  if (!conversation) throw new Error("Messages require at least one conversation.")

  return conversation
}

function addReadConversationId(readConversationIds: readonly string[], conversationId: string) {
  return readConversationIds.includes(conversationId)
    ? readConversationIds
    : [...readConversationIds, conversationId]
}

export function createMessagesState(data: MessagesData): MessagesState {
  const initialConversation = requireInitialConversation(data)

  return {
    draft: "",
    localMessages: [],
    menuOpen: false,
    readConversationIds: [],
    searchQuery: "",
    selection: {
      conversationId: initialConversation.id,
      mobilePane: "conversation-list",
    },
  }
}

export function messagesReducer(
  state: MessagesState,
  action: MessagesAction,
  data: MessagesData,
): MessagesState {
  switch (action.type) {
    case "conversationSelected": {
      const conversation = data.conversations.find(({ id }) => id === action.conversationId)
      if (!conversation) return state

      return {
        ...state,
        menuOpen: false,
        readConversationIds: conversation.unread
          ? addReadConversationId(state.readConversationIds, conversation.id)
          : state.readConversationIds,
        selection: {
          conversationId: conversation.id,
          mobilePane: "thread",
        },
      }
    }
    case "draftChanged":
      return action.draft === state.draft ? state : { ...state, draft: action.draft }
    case "menuOpenChanged":
      return action.open === state.menuOpen ? state : { ...state, menuOpen: action.open }
    case "messageSubmitted": {
      const message = action.message.trim()
      if (state.selection.conversationId !== data.activeConversationId || message.length === 0) {
        return state
      }

      return {
        ...state,
        draft: "",
        localMessages: [
          ...state.localMessages,
          createLocalClinicMessage(message, state.localMessages.length + 1),
        ],
      }
    }
    case "mobileInboxRequested":
      return {
        ...state,
        menuOpen: false,
        selection: {
          ...state.selection,
          mobilePane: "conversation-list",
        },
      }
    case "searchQueryChanged":
      return action.query === state.searchQuery ? state : { ...state, searchQuery: action.query }
    case "unreadToggled": {
      const conversation = data.conversations.find(({ id }) => id === state.selection.conversationId)
      if (!conversation?.unread) return state

      const unreadCount = getConversationUnreadCount(conversation, state.readConversationIds)

      return {
        ...state,
        readConversationIds:
          unreadCount > 0
            ? addReadConversationId(state.readConversationIds, conversation.id)
            : state.readConversationIds.filter((conversationId) => conversationId !== conversation.id),
      }
    }
  }
}
