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

function selectMessagesConversation(
  state: MessagesState,
  conversations: readonly ClinicConversation[],
  snapshot: MessagesSnapshot,
) {
  const conversation =
    conversations.find(({ id }) => id === state.selection.conversationId) ??
    conversations.find(({ id }) => id === snapshot.activeConversationId) ??
    conversations[0]

  if (!conversation) throw new Error("Messages require at least one conversation.")

  return conversation
}

export function selectMessagesViewModel(
  state: MessagesState,
  snapshot: MessagesSnapshot,
  isInteractive: boolean,
): MessagesViewModel {
  const projectedState = isInteractive ? state : createMessagesState({ inquiry: state.inquiry, snapshot })
  const conversations = snapshot.conversations
  const selectedConversation = selectMessagesConversation(projectedState, conversations, snapshot)
  const filteredConversations = filterConversations(conversations, projectedState.searchQuery)
  const hasFullConversation = selectedConversation.id === snapshot.activeConversationId

  return {
    attachment: projectedState.attachment,
    attachmentError: projectedState.attachmentError,
    dateLabel: snapshot.dateLabel,
    draft: projectedState.draft,
    hasFullConversation,
    isInteractive,
    isSending: projectedState.isSending,
    menuOpen: isInteractive && projectedState.menuOpen,
    messageStatus: projectedState.messageStatus,
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
    totalUnreadCount: getTotalUnreadCount(conversations, projectedState.readConversationIds),
    visibleMessages: hasFullConversation ? [...snapshot.messages, ...projectedState.localMessages] : [],
  }
}
