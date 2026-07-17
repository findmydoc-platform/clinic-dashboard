"use client"

import { useReducer } from "react"
import { type MessagesControllerActions, type MessagesData, type MessagesViewModel } from "../model/messages"
import {
  createMessagesState,
  messagesReducer,
  type MessagesAction,
  type MessagesState,
} from "../model/messages.reducer"
import { selectMessagesViewModel } from "../model/messages.selectors"

type UseMessagesControllerInput = Readonly<{
  data: MessagesData
  isInteractive: boolean
}>

export function useMessagesController({ data, isInteractive }: UseMessagesControllerInput): Readonly<{
  actions: MessagesControllerActions
  model: MessagesViewModel
}> {
  const [state, dispatch] = useReducer(
    (current: MessagesState, action: MessagesAction) => messagesReducer(current, action, data),
    data,
    createMessagesState,
  )
  const model = selectMessagesViewModel(state, data, isInteractive)

  return {
    actions: {
      onConversationSelect: (conversationId) => dispatch({ conversationId, type: "conversationSelected" }),
      onDraftChange: (draft) => dispatch({ draft, type: "draftChanged" }),
      onMenuOpenChange: (open) => dispatch({ open, type: "menuOpenChanged" }),
      onMessageSend: (message) => dispatch({ message: message.trim(), type: "messageSubmitted" }),
      onMobileBack: () => dispatch({ type: "mobileInboxRequested" }),
      onSearchQueryChange: (query) => dispatch({ query, type: "searchQueryChanged" }),
      onUnreadToggle: () => dispatch({ type: "unreadToggled" }),
    },
    model,
  }
}
