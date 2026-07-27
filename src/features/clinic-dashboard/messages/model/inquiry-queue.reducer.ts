import type { PatientInquiry, PatientInquiryStatus, PatientInquiryStatusEvent } from "./inquiries"
import { getPatientInquiryStatusLabel } from "./inquiries"

export type InquiryQueueState = Readonly<{
  inquiries: readonly PatientInquiry[]
  isStatusMenuOpen: boolean
  mobilePane: "inquiry-list" | "inquiry"
  pendingStatusUpdate?: Readonly<{
    from: PatientInquiryStatus
    inquiryId: string
    to: PatientInquiryStatus
  }>
  searchQuery: string
  selectedInquiryId?: string
  statusError?: Readonly<{
    inquiryId: string
    message: string
  }>
  statusEvents: readonly PatientInquiryStatusEvent[]
  statusMessage: string
}>

export type InquiryQueueAction =
  | Readonly<{ inquiryId: string; type: "inquirySelected" }>
  | Readonly<{ open: boolean; type: "statusMenuOpenChanged" }>
  | Readonly<{ query: string; type: "searchQueryChanged" }>
  | Readonly<{ type: "mobileInboxRequested" }>
  | Readonly<{
      from: PatientInquiryStatus
      inquiryId: string
      to: PatientInquiryStatus
      type: "statusUpdateStarted"
    }>
  | Readonly<{
      changedAt: string
      inquiry: PatientInquiry
      type: "statusUpdateSucceeded"
    }>
  | Readonly<{ inquiryId: string; type: "statusUpdateFailed" }>

export function createInquiryQueueState(inquiries: readonly PatientInquiry[]): InquiryQueueState {
  return {
    inquiries: inquiries.map((inquiry) => ({ ...inquiry })),
    isStatusMenuOpen: false,
    mobilePane: "inquiry-list",
    searchQuery: "",
    selectedInquiryId: inquiries[0]?.id,
    statusEvents: [],
    statusMessage: "",
  }
}

export function inquiryQueueReducer(state: InquiryQueueState, action: InquiryQueueAction): InquiryQueueState {
  switch (action.type) {
    case "inquirySelected":
      return state.inquiries.some(({ id }) => id === action.inquiryId)
        ? {
            ...state,
            isStatusMenuOpen: false,
            mobilePane: "inquiry",
            selectedInquiryId: action.inquiryId,
          }
        : state
    case "mobileInboxRequested":
      return {
        ...state,
        isStatusMenuOpen: false,
        mobilePane: "inquiry-list",
      }
    case "searchQueryChanged":
      return action.query === state.searchQuery ? state : { ...state, searchQuery: action.query }
    case "statusMenuOpenChanged":
      return action.open === state.isStatusMenuOpen ? state : { ...state, isStatusMenuOpen: action.open }
    case "statusUpdateStarted":
      return {
        ...state,
        isStatusMenuOpen: false,
        pendingStatusUpdate: {
          from: action.from,
          inquiryId: action.inquiryId,
          to: action.to,
        },
        statusError: undefined,
        statusMessage: `Updating status to ${getPatientInquiryStatusLabel(action.to)}…`,
      }
    case "statusUpdateFailed":
      if (state.pendingStatusUpdate?.inquiryId !== action.inquiryId) return state
      return {
        ...state,
        pendingStatusUpdate: undefined,
        statusError: {
          inquiryId: action.inquiryId,
          message: "The inquiry status could not be updated. Refresh and try again.",
        },
        statusMessage: "Status update failed.",
      }
    case "statusUpdateSucceeded": {
      const pending = state.pendingStatusUpdate
      if (!pending || pending.inquiryId !== action.inquiry.id) return state

      const statusEvent: PatientInquiryStatusEvent = {
        changedAt: action.changedAt,
        from: pending.from,
        id: `${action.inquiry.id}:${action.changedAt}:${action.inquiry.status}`,
        inquiryId: action.inquiry.id,
        to: action.inquiry.status,
      }

      return {
        ...state,
        inquiries: state.inquiries.map((inquiry) =>
          inquiry.id === action.inquiry.id ? { ...action.inquiry } : inquiry,
        ),
        pendingStatusUpdate: undefined,
        statusError: undefined,
        statusEvents: [...state.statusEvents, statusEvent],
        statusMessage: `Status changed to ${getPatientInquiryStatusLabel(action.inquiry.status)}.`,
      }
    }
  }
}
