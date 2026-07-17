import {
  conversationSections,
  filterConversations,
  getConversationUnreadCount,
  getTotalUnreadCount,
  type ClinicConversation,
  type MessagesSnapshot,
  type MessagesViewModel,
} from "./messages"
import { createMessagesState, type MessagesState } from "./messages.reducer"

function selectMessagesConversation(state: MessagesState, snapshot: MessagesSnapshot): ClinicConversation {
  const conversation =
    snapshot.conversations.find(({ id }) => id === state.selection.conversationId) ??
    snapshot.conversations.find(({ id }) => id === snapshot.activeConversationId) ??
    snapshot.conversations[0]

  if (!conversation) throw new Error("Messages require at least one conversation.")

  return conversation
}

export function selectMessagesViewModel(
  state: MessagesState,
  snapshot: MessagesSnapshot,
  isInteractive: boolean,
): MessagesViewModel {
  const projectedState = isInteractive ? state : createMessagesState(snapshot)
  const selectedConversation = selectMessagesConversation(projectedState, snapshot)
  const filteredConversations = filterConversations(snapshot.conversations, projectedState.searchQuery)
  const hasFullConversation = selectedConversation.id === snapshot.activeConversationId

  return {
    dateLabel: snapshot.dateLabel,
    draft: projectedState.draft,
    hasFullConversation,
    isInteractive,
    menuOpen: isInteractive && projectedState.menuOpen,
    mobileThreadOpen: isInteractive && projectedState.selection.mobilePane === "thread",
    searchQuery: projectedState.searchQuery,
    sections: conversationSections.map((name) => ({
      conversations: filteredConversations
        .filter((conversation) => conversation.section === name)
        .map((conversation) => ({
          conversation,
          isActive: conversation.id === selectedConversation.id,
          unreadCount: getConversationUnreadCount(conversation, projectedState.readConversationIds),
        })),
      name,
    })),
    selectedConversation,
    selectedUnreadCount: getConversationUnreadCount(selectedConversation, projectedState.readConversationIds),
    totalConversationCount: filteredConversations.length,
    totalUnreadCount: getTotalUnreadCount(snapshot.conversations, projectedState.readConversationIds),
    visibleMessages: hasFullConversation ? [...snapshot.messages, ...projectedState.localMessages] : [],
  }
}
