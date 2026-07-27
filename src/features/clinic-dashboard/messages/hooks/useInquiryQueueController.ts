"use client"

import { useEffect, useReducer, useRef } from "react"
import type { InquiryStatusCommands } from "../model/inquiry-status-commands"
import {
  type InquiryQueueActions,
  type InquiryQueueViewModel,
  isAllowedPatientInquiryStatusTransition,
  type PatientInquiryQueueSnapshot,
  type PatientInquiryStatus,
} from "../model/inquiries"
import { createInquiryQueueState, inquiryQueueReducer } from "../model/inquiry-queue.reducer"
import { selectInquiryQueueViewModel } from "../model/inquiry-queue.selectors"

type UseInquiryQueueControllerInput = Readonly<{
  commands: InquiryStatusCommands
  snapshot: PatientInquiryQueueSnapshot
}>

export function useInquiryQueueController({ commands, snapshot }: UseInquiryQueueControllerInput): Readonly<{
  actions: InquiryQueueActions
  model: InquiryQueueViewModel
}> {
  const [state, dispatch] = useReducer(inquiryQueueReducer, snapshot.inquiries, createInquiryQueueState)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const model = selectInquiryQueueViewModel(state, snapshot.status)

  const onStatusChange = async (status: PatientInquiryStatus) => {
    const inquiry = model.selectedInquiry
    if (
      !inquiry ||
      state.pendingStatusUpdate ||
      !isAllowedPatientInquiryStatusTransition(inquiry.status, status)
    ) {
      return
    }

    dispatch({
      from: inquiry.status,
      inquiryId: inquiry.id,
      to: status,
      type: "statusUpdateStarted",
    })

    try {
      const result = await commands.updateStatus({ inquiryId: inquiry.id, status })
      if (isMountedRef.current) {
        dispatch({
          changedAt: result.changedAt,
          inquiry: result.inquiry,
          type: "statusUpdateSucceeded",
        })
      }
    } catch {
      if (isMountedRef.current) dispatch({ inquiryId: inquiry.id, type: "statusUpdateFailed" })
    }
  }

  return {
    actions: {
      onInquirySelect: (inquiryId) => dispatch({ inquiryId, type: "inquirySelected" }),
      onMobileBack: () => dispatch({ type: "mobileInboxRequested" }),
      onSearchQueryChange: (query) => dispatch({ query, type: "searchQueryChanged" }),
      onStatusChange,
      onStatusMenuOpenChange: (open) => dispatch({ open, type: "statusMenuOpenChanged" }),
    },
    model,
  }
}
