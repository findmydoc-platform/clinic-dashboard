"use client"

import { useEffect, useReducer } from "react"
import {
  type MessagesControllerActions,
  type MessagesSnapshot,
  type MessagesViewModel,
} from "../model/messages"
import {
  createMessagesState,
  messagesReducer,
  type MessagesAction,
  type MessagesState,
} from "../model/messages.reducer"
import { selectMessagesViewModel } from "../model/messages.selectors"

type UseMessagesControllerInput = Readonly<{
  isInteractive: boolean
  snapshot: MessagesSnapshot
}>

export function useMessagesController({ isInteractive, snapshot }: UseMessagesControllerInput): Readonly<{
  actions: MessagesControllerActions
  model: MessagesViewModel
}> {
  const [state, dispatch] = useReducer(
    (current: MessagesState, action: MessagesAction) => messagesReducer(current, action, snapshot),
    snapshot,
    createMessagesState,
  )

  useEffect(() => {
    if (!isInteractive) dispatch({ type: "interaction-withdrawn" })
  }, [isInteractive])

  const model = selectMessagesViewModel(state, snapshot, isInteractive)
  const dispatchIfInteractive = (action: MessagesAction) => {
    if (isInteractive) dispatch(action)
  }

  return {
    actions: {
      onConversationSelect: (conversationId) =>
        dispatchIfInteractive({ conversationId, type: "conversationSelected" }),
      onDraftChange: (draft) => dispatchIfInteractive({ draft, type: "draftChanged" }),
      onMenuOpenChange: (open) => dispatchIfInteractive({ open, type: "menuOpenChanged" }),
      onMessageSend: (message) =>
        dispatchIfInteractive({ message: message.trim(), type: "messageSubmitted" }),
      onMobileBack: () => dispatchIfInteractive({ type: "mobileInboxRequested" }),
      onSearchQueryChange: (query) => dispatchIfInteractive({ query, type: "searchQueryChanged" }),
      onUnreadToggle: () => dispatchIfInteractive({ type: "unreadToggled" }),
    },
    model,
  }
}
