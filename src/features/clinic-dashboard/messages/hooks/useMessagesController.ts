"use client"

import { useEffect, useLayoutEffect, useReducer, useRef } from "react"
import type { MessageCommands } from "../model/message-commands"
import {
  type MessagesControllerActions,
  type MessagesSnapshot,
  type MessagesViewModel,
  type PatientInquiryProfile,
} from "../model/messages"
import {
  createMessagesState,
  messagesReducer,
  type MessagesAction,
  type MessagesState,
} from "../model/messages.reducer"
import { selectMessagesViewModel } from "../model/messages.selectors"

type UseMessagesControllerInput = Readonly<{
  initialInquiryOpen?: boolean
  inquiry: PatientInquiryProfile
  isInteractive: boolean
  messageCommands: MessageCommands
  snapshot: MessagesSnapshot
}>

export function useMessagesController({
  initialInquiryOpen,
  inquiry,
  isInteractive,
  messageCommands,
  snapshot,
}: UseMessagesControllerInput): Readonly<{
  actions: MessagesControllerActions
  inquiryModel: Readonly<{
    inquiry: PatientInquiryProfile
    isOpen: boolean
  }>
  model: MessagesViewModel
}> {
  const [state, dispatch] = useReducer(
    (current: MessagesState, action: MessagesAction) => messagesReducer(current, action, snapshot),
    { initialInquiryOpen, inquiry, snapshot },
    createMessagesState,
  )
  const isInteractiveRef = useRef(isInteractive)

  useLayoutEffect(() => {
    isInteractiveRef.current = isInteractive
  }, [isInteractive])

  useEffect(() => {
    if (!isInteractive) dispatch({ type: "interaction-withdrawn" })
  }, [isInteractive])

  const model = selectMessagesViewModel(state, snapshot, isInteractive)
  const dispatchIfInteractive = (action: MessagesAction) => {
    if (isInteractive) dispatch(action)
  }

  const onMessageSend = async () => {
    const body = state.draft.trim()
    if (!isInteractive || state.isSending || (!body && !state.attachment)) return

    dispatch({ type: "messageSendStarted" })
    try {
      const message = await messageCommands.sendMessage({
        attachment: state.attachment,
        body,
        conversationId: state.selection.conversationId,
      })
      if (isInteractiveRef.current) dispatch({ message, type: "messageSendSucceeded" })
    } catch {
      if (isInteractiveRef.current) dispatch({ type: "messageSendFailed" })
    }
  }

  return {
    actions: {
      onAttachmentRemove: () => dispatchIfInteractive({ type: "attachmentRemoved" }),
      onAttachmentSelect: (attachment) => dispatchIfInteractive({ attachment, type: "attachmentSelected" }),
      onConversationSelect: (conversationId) =>
        dispatchIfInteractive({ conversationId, type: "conversationSelected" }),
      onDraftChange: (draft) => dispatchIfInteractive({ draft, type: "draftChanged" }),
      onInquiryOpenChange: (open) => dispatchIfInteractive({ open, type: "inquiryOpenChanged" }),
      onMenuOpenChange: (open) => dispatchIfInteractive({ open, type: "menuOpenChanged" }),
      onMessageSend,
      onMobileBack: () => dispatchIfInteractive({ type: "mobileInboxRequested" }),
      onSearchQueryChange: (query) => dispatchIfInteractive({ query, type: "searchQueryChanged" }),
      onUnreadToggle: () => dispatchIfInteractive({ type: "unreadToggled" }),
    },
    inquiryModel: {
      inquiry: state.inquiry,
      isOpen: state.inquiryOpen,
    },
    model,
  }
}
