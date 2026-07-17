import {
  conversationSections,
  filterConversations,
  getConversationUnreadCount,
  getTotalUnreadCount,
  type ClinicConversation,
  type MessagesData,
  type MessagesViewModel,
} from "./messages"
import type { MessagesState } from "./messages.reducer"

function selectMessagesConversation(state: MessagesState, data: MessagesData): ClinicConversation {
  const conversation =
    data.conversations.find(({ id }) => id === state.selection.conversationId) ??
    data.conversations.find(({ id }) => id === data.activeConversationId) ??
    data.conversations[0]

  if (!conversation) throw new Error("Messages require at least one conversation.")

  return conversation
}

export function selectMessagesViewModel(
  state: MessagesState,
  data: MessagesData,
  isInteractive: boolean,
): MessagesViewModel {
  const selectedConversation = selectMessagesConversation(state, data)
  const filteredConversations = filterConversations(data.conversations, state.searchQuery)
  const hasFullConversation = selectedConversation.id === data.activeConversationId

  return {
    dateLabel: data.dateLabel,
    draft: state.draft,
    hasFullConversation,
    isInteractive,
    menuOpen: isInteractive && state.menuOpen,
    mobileThreadOpen: isInteractive && state.selection.mobilePane === "thread",
    searchQuery: state.searchQuery,
    sections: conversationSections.map((name) => ({
      conversations: filteredConversations
        .filter((conversation) => conversation.section === name)
        .map((conversation) => ({
          conversation,
          isActive: conversation.id === selectedConversation.id,
          unreadCount: getConversationUnreadCount(conversation, state.readConversationIds),
        })),
      name,
    })),
    selectedConversation,
    selectedUnreadCount: getConversationUnreadCount(selectedConversation, state.readConversationIds),
    totalConversationCount: filteredConversations.length,
    totalUnreadCount: getTotalUnreadCount(data.conversations, state.readConversationIds),
    visibleMessages: hasFullConversation ? [...data.messages, ...state.localMessages] : [],
  }
}
