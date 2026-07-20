import {
  getConversationUnreadCount,
  validateMessageAttachment,
  type ClinicMessage,
  type MessageAttachmentMetadata,
  type MessagesSnapshot,
  type PatientInquiryProfile,
} from "./messages"

export type MessagesSelection = Readonly<{
  conversationId: string
  mobilePane: "conversation-list" | "thread"
}>

export type MessagesState = Readonly<{
  attachment?: MessageAttachmentMetadata
  attachmentError?: string
  draft: string
  inquiry: PatientInquiryProfile
  inquiryOpen: boolean
  isSending: boolean
  localMessages: readonly ClinicMessage[]
  menuOpen: boolean
  messageStatus: string
  readConversationIds: readonly string[]
  searchQuery: string
  selection: MessagesSelection
}>

export type MessagesAction =
  | Readonly<{ attachment: MessageAttachmentMetadata; type: "attachmentSelected" }>
  | Readonly<{ conversationId: string; type: "conversationSelected" }>
  | Readonly<{ draft: string; type: "draftChanged" }>
  | Readonly<{ type: "attachmentRemoved" }>
  | Readonly<{ type: "interaction-withdrawn" }>
  | Readonly<{ open: boolean; type: "inquiryOpenChanged" }>
  | Readonly<{ open: boolean; type: "menuOpenChanged" }>
  | Readonly<{ message: ClinicMessage; type: "messageSendSucceeded" }>
  | Readonly<{ type: "messageSendFailed" }>
  | Readonly<{ type: "messageSendStarted" }>
  | Readonly<{ type: "mobileInboxRequested" }>
  | Readonly<{ query: string; type: "searchQueryChanged" }>
  | Readonly<{ type: "unreadToggled" }>

function requireInitialConversation(snapshot: MessagesSnapshot) {
  const conversation =
    snapshot.conversations.find(({ id }) => id === snapshot.activeConversationId) ?? snapshot.conversations[0]

  if (!conversation) throw new Error("Messages require at least one conversation.")

  return conversation
}

function addReadConversationId(readConversationIds: readonly string[], conversationId: string) {
  return readConversationIds.includes(conversationId)
    ? readConversationIds
    : [...readConversationIds, conversationId]
}

export function createMessagesState(
  input: Readonly<{
    initialInquiryOpen?: boolean
    inquiry: PatientInquiryProfile
    snapshot: MessagesSnapshot
  }>,
): MessagesState {
  const initialConversation = requireInitialConversation(input.snapshot)

  return {
    draft: "",
    inquiry: { ...input.inquiry },
    inquiryOpen: input.initialInquiryOpen ?? false,
    isSending: false,
    localMessages: [],
    menuOpen: false,
    messageStatus: "",
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
  snapshot: MessagesSnapshot,
): MessagesState {
  switch (action.type) {
    case "attachmentRemoved":
      return { ...state, attachment: undefined, attachmentError: undefined }
    case "attachmentSelected": {
      const attachmentError = validateMessageAttachment(action.attachment)
      return attachmentError
        ? { ...state, attachment: undefined, attachmentError }
        : { ...state, attachment: action.attachment, attachmentError: undefined }
    }
    case "conversationSelected": {
      const conversation = snapshot.conversations.find(({ id }) => id === action.conversationId)
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
    case "inquiryOpenChanged":
      return action.open === state.inquiryOpen ? state : { ...state, inquiryOpen: action.open }
    case "interaction-withdrawn":
      return state.menuOpen || state.inquiryOpen ? { ...state, inquiryOpen: false, menuOpen: false } : state
    case "menuOpenChanged":
      return action.open === state.menuOpen ? state : { ...state, menuOpen: action.open }
    case "messageSendFailed":
      return {
        ...state,
        isSending: false,
        messageStatus: "The demo message could not be added. Try again.",
      }
    case "messageSendStarted":
      return { ...state, isSending: true, messageStatus: "Adding message locally…" }
    case "messageSendSucceeded":
      return {
        ...state,
        attachment: undefined,
        attachmentError: undefined,
        draft: "",
        isSending: false,
        localMessages: [...state.localMessages, action.message],
        messageStatus: "Demo only — message added locally; nothing was sent.",
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
      const conversation = snapshot.conversations.find(({ id }) => id === state.selection.conversationId)
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
