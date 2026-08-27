import type {
  InquiryAttachmentDraftState,
  InquiryComposerMode,
  InquiryConflictResolution,
  InquiryContactReauthentication,
  InquiryPrimaryFilter,
} from "./inquiry-workspace"
import type {
  InquiryHandlingStatus,
  InquiryUnreadProjection,
  PatientInquiry,
  PatientInquiryDetail,
  PatientInquiryQueueSnapshot,
} from "./inquiries"

type InquiryDrafts = Readonly<Record<string, Readonly<{ note: string; reply: string }>>>

export type InquiryQueueState = Readonly<{
  activeComposerMode: InquiryComposerMode
  attachments: Readonly<Record<string, InquiryAttachmentDraftState | undefined>>
  availability: PatientInquiryQueueSnapshot["status"]
  conflict?: InquiryConflictResolution
  contactReauthentication?: InquiryContactReauthentication
  firstPageChangeCursor?: string
  detailError?: string
  detailStatus: "idle" | "loading" | "ready" | "refresh-error"
  details: Readonly<Record<string, PatientInquiryDetail | undefined>>
  drafts: InquiryDrafts
  handlingStatusFilter: readonly Exclude<InquiryHandlingStatus, "spam">[]
  inquiries: readonly PatientInquiry[]
  isMutating: boolean
  isLoadingQueue: boolean
  lifecycleFilter: InquiryPrimaryFilter
  mobilePane: "inquiry-list" | "inquiry"
  mutationError?: string
  nextCursor?: string
  searchQuery: string
  selectedInquiryId?: string
  statusMessage: string
  unreadCount: number
}>

export type InquiryQueueAction =
  | Readonly<{ filter: InquiryPrimaryFilter; type: "primaryFilterChanged" }>
  | Readonly<{
      statuses: readonly Exclude<InquiryHandlingStatus, "spam">[]
      type: "handlingStatusFilterChanged"
    }>
  | Readonly<{ mode: InquiryComposerMode; type: "composerModeChanged" }>
  | Readonly<{ query: string; type: "searchQueryChanged" }>
  | Readonly<{ type: "conflictDismissed" }>
  | Readonly<{ inquiryId: string; type: "replyDraftConvertedToNote" }>
  | Readonly<{ type: "contactReauthenticationDismissed" }>
  | Readonly<{
      contactReauthentication: InquiryContactReauthentication
      type: "contactReauthenticationRequired"
    }>
  | Readonly<{ type: "mobileInboxRequested" }>
  | Readonly<{ type: "queueLoadStarted" }>
  | Readonly<{ type: "queueLoadFailed" }>
  | Readonly<{
      changeCursor: string
      type: "queueUnchanged"
      unreadCount: number
    }>
  | Readonly<{
      mode: "append" | "refresh" | "replace"
      snapshot: Extract<PatientInquiryQueueSnapshot, { status: "ready" }>
      type: "queueLoaded"
    }>
  | Readonly<{ inquiryId: string; message: string; type: "inquiryAccessLost" }>
  | Readonly<{ message: string; type: "workspaceAccessLost" }>
  | Readonly<{ message: string; type: "sessionLost" }>
  | Readonly<{ inquiryId: string; type: "inquiryLoadStarted" }>
  | Readonly<{ inquiry: PatientInquiryDetail; type: "inquiryLoadSucceeded" }>
  | Readonly<{ inquiryId: string; message: string; type: "inquiryLoadFailed" }>
  | Readonly<{ type: "refreshStarted" }>
  | Readonly<{ message: string; type: "refreshFailed" }>
  | Readonly<{ inquiry: PatientInquiryDetail; type: "refreshSucceeded" }>
  | Readonly<{ inquiry: PatientInquiryDetail; type: "backgroundRefreshSucceeded" }>
  | Readonly<{ inquiryId: string; mode: InquiryComposerMode; type: "draftChanged"; value: string }>
  | Readonly<{
      attachment?: InquiryAttachmentDraftState
      inquiryId: string
      type: "attachmentChanged"
    }>
  | Readonly<{ message: string; type: "mutationStarted" }>
  | Readonly<{
      clearAttachment?: boolean
      clearDraftMode?: InquiryComposerMode
      inquiry: PatientInquiryDetail
      message: string
      type: "mutationSucceeded"
    }>
  | Readonly<{
      conflict?: InquiryConflictResolution
      message: string
      type: "mutationFailed"
    }>
  | Readonly<{
      inquiryId: string
      type: "readPositionChanged"
      unread: InquiryUnreadProjection
    }>

export function createInquiryQueueState(snapshot: PatientInquiryQueueSnapshot): InquiryQueueState {
  return {
    activeComposerMode: "reply",
    attachments: {},
    availability: snapshot.status,
    detailStatus: "idle",
    details: {},
    drafts: {},
    firstPageChangeCursor: snapshot.status === "ready" ? snapshot.changeCursor : undefined,
    handlingStatusFilter: [],
    inquiries: snapshot.inquiries.map((inquiry) => ({ ...inquiry })),
    isMutating: false,
    isLoadingQueue: false,
    lifecycleFilter: "open",
    mobilePane: "inquiry-list",
    nextCursor: snapshot.status === "ready" ? snapshot.nextCursor : undefined,
    searchQuery: "",
    statusMessage: "",
    unreadCount: snapshot.status === "ready" ? snapshot.unreadCount : 0,
  }
}

function projectDetailIntoQueue(inquiries: readonly PatientInquiry[], detail: PatientInquiryDetail) {
  return inquiries.map((inquiry) => (inquiry.id === detail.id ? detail : inquiry))
}

function projectUnreadCount(
  unreadCount: number,
  inquiries: readonly PatientInquiry[],
  detail: PatientInquiryDetail,
) {
  const previous = inquiries.find(({ id }) => id === detail.id)?.unread.isUnread ? 1 : 0
  const next = detail.unread.isUnread ? 1 : 0
  return Math.max(0, unreadCount - previous + next)
}

function updateDraft(drafts: InquiryDrafts, inquiryId: string, mode: InquiryComposerMode, value: string) {
  const current = drafts[inquiryId] ?? { note: "", reply: "" }
  return { ...drafts, [inquiryId]: { ...current, [mode]: value } }
}

export function inquiryQueueReducer(state: InquiryQueueState, action: InquiryQueueAction): InquiryQueueState {
  switch (action.type) {
    case "primaryFilterChanged":
      return action.filter === state.lifecycleFilter
        ? state
        : {
            ...state,
            handlingStatusFilter: action.filter === "spam" ? [] : state.handlingStatusFilter,
            lifecycleFilter: action.filter,
          }
    case "handlingStatusFilterChanged":
      return action.statuses.length === state.handlingStatusFilter.length &&
        action.statuses.every((status) => state.handlingStatusFilter.includes(status))
        ? state
        : { ...state, handlingStatusFilter: [...action.statuses] }
    case "composerModeChanged":
      return action.mode === state.activeComposerMode ? state : { ...state, activeComposerMode: action.mode }
    case "searchQueryChanged":
      return action.query === state.searchQuery ? state : { ...state, searchQuery: action.query }
    case "conflictDismissed":
      return state.conflict ? { ...state, conflict: undefined, mutationError: undefined } : state
    case "replyDraftConvertedToNote": {
      const draft = state.drafts[action.inquiryId]
      if (!draft?.reply) return state
      const note = draft.note ? `${draft.note}\n\n${draft.reply}` : draft.reply
      if (note.length > 3_000) return state
      return {
        ...state,
        activeComposerMode: "note",
        conflict: undefined,
        drafts: { ...state.drafts, [action.inquiryId]: { note, reply: "" } },
        mutationError: undefined,
        statusMessage: "Reply draft moved to an internal note draft.",
      }
    }
    case "contactReauthenticationDismissed":
      return state.contactReauthentication
        ? { ...state, contactReauthentication: undefined, mutationError: undefined }
        : state
    case "contactReauthenticationRequired":
      return {
        ...state,
        contactReauthentication: action.contactReauthentication,
        isMutating: false,
        mutationError: undefined,
        statusMessage: "Fresh authentication required.",
      }
    case "mobileInboxRequested":
      return { ...state, mobilePane: "inquiry-list" }
    case "queueLoadStarted":
      return { ...state, isLoadingQueue: true }
    case "queueLoadFailed":
      return { ...state, isLoadingQueue: false }
    case "queueUnchanged":
      return {
        ...state,
        availability: "ready",
        firstPageChangeCursor: action.changeCursor,
        isLoadingQueue: false,
        unreadCount: action.unreadCount,
      }
    case "queueLoaded":
      if (action.mode !== "append") {
        return {
          ...state,
          availability: "ready",
          firstPageChangeCursor: action.snapshot.changeCursor,
          inquiries: action.snapshot.inquiries,
          isLoadingQueue: false,
          nextCursor: action.snapshot.nextCursor,
          unreadCount: action.snapshot.unreadCount,
        }
      }
      return {
        ...state,
        availability: "ready",
        firstPageChangeCursor: state.firstPageChangeCursor,
        inquiries: [
          ...state.inquiries.filter(
            (current) => !action.snapshot.inquiries.some((next) => next.id === current.id),
          ),
          ...action.snapshot.inquiries,
        ].sort((left, right) => right.lastActivityAt.localeCompare(left.lastActivityAt)),
        isLoadingQueue: false,
        nextCursor: action.snapshot.nextCursor,
        unreadCount: action.snapshot.unreadCount,
      }
    case "inquiryAccessLost": {
      const { [action.inquiryId]: _removedDetail, ...details } = state.details
      const { [action.inquiryId]: _removedDraft, ...drafts } = state.drafts
      const { [action.inquiryId]: _removedAttachment, ...attachments } = state.attachments
      const wasSelected = state.selectedInquiryId === action.inquiryId
      return {
        ...state,
        attachments,
        contactReauthentication: wasSelected ? undefined : state.contactReauthentication,
        detailError: wasSelected ? action.message : state.detailError,
        detailStatus: wasSelected ? "idle" : state.detailStatus,
        details,
        drafts,
        inquiries: state.inquiries.filter(({ id }) => id !== action.inquiryId),
        isMutating: wasSelected ? false : state.isMutating,
        mobilePane: wasSelected ? "inquiry-list" : state.mobilePane,
        mutationError: wasSelected ? undefined : state.mutationError,
        selectedInquiryId: wasSelected ? undefined : state.selectedInquiryId,
        statusMessage: wasSelected ? "Inquiry access ended." : state.statusMessage,
        unreadCount: Math.max(
          0,
          state.unreadCount -
            (state.inquiries.find(({ id }) => id === action.inquiryId)?.unread.isUnread ? 1 : 0),
        ),
      }
    }
    case "workspaceAccessLost":
      return {
        ...state,
        attachments: {},
        availability: "temporarily-unavailable",
        conflict: undefined,
        contactReauthentication: undefined,
        detailError: action.message,
        detailStatus: "idle",
        details: {},
        drafts: {},
        firstPageChangeCursor: undefined,
        inquiries: [],
        isMutating: false,
        isLoadingQueue: false,
        mobilePane: "inquiry-list",
        mutationError: undefined,
        nextCursor: undefined,
        selectedInquiryId: undefined,
        statusMessage: "Inquiry access ended.",
        unreadCount: 0,
      }
    case "sessionLost":
      return {
        ...state,
        attachments: {},
        availability: "temporarily-unavailable",
        conflict: undefined,
        contactReauthentication: undefined,
        detailError: action.message,
        detailStatus: "idle",
        details: {},
        drafts: {},
        firstPageChangeCursor: undefined,
        inquiries: [],
        isMutating: false,
        isLoadingQueue: false,
        mobilePane: "inquiry-list",
        mutationError: undefined,
        selectedInquiryId: undefined,
        statusMessage: "Session ended.",
        unreadCount: 0,
      }
    case "inquiryLoadStarted":
      return {
        ...state,
        activeComposerMode: "reply",
        conflict: undefined,
        contactReauthentication: undefined,
        detailError: undefined,
        detailStatus: "loading",
        mobilePane: "inquiry",
        mutationError: undefined,
        selectedInquiryId: action.inquiryId,
        statusMessage: "Loading inquiry…",
      }
    case "inquiryLoadSucceeded":
      if (state.selectedInquiryId !== action.inquiry.id) return state
      return {
        ...state,
        activeComposerMode: action.inquiry.actions.canReply ? "reply" : "note",
        detailStatus: "ready",
        details: { ...state.details, [action.inquiry.id]: action.inquiry },
        inquiries: projectDetailIntoQueue(state.inquiries, action.inquiry),
        statusMessage: "Inquiry loaded.",
      }
    case "inquiryLoadFailed":
      if (state.selectedInquiryId !== action.inquiryId) return state
      return {
        ...state,
        detailError: action.message,
        detailStatus: "refresh-error",
        statusMessage: "Inquiry loading failed.",
      }
    case "refreshStarted":
      return { ...state, detailError: undefined, statusMessage: "Refreshing inquiry…" }
    case "refreshFailed":
      return {
        ...state,
        detailError: action.message,
        detailStatus:
          state.selectedInquiryId && state.details[state.selectedInquiryId] ? "refresh-error" : "idle",
        statusMessage: "Refresh failed.",
      }
    case "refreshSucceeded":
      return {
        ...state,
        detailError: undefined,
        detailStatus: "ready",
        details: { ...state.details, [action.inquiry.id]: action.inquiry },
        inquiries: projectDetailIntoQueue(state.inquiries, action.inquiry),
        statusMessage: "Inquiry refreshed.",
      }
    case "backgroundRefreshSucceeded":
      return {
        ...state,
        detailError: undefined,
        detailStatus: "ready",
        details: { ...state.details, [action.inquiry.id]: action.inquiry },
        inquiries: projectDetailIntoQueue(state.inquiries, action.inquiry),
      }
    case "draftChanged":
      return {
        ...state,
        drafts: updateDraft(state.drafts, action.inquiryId, action.mode, action.value),
        mutationError: undefined,
      }
    case "attachmentChanged":
      return {
        ...state,
        attachments: { ...state.attachments, [action.inquiryId]: action.attachment },
        mutationError: undefined,
      }
    case "mutationStarted":
      return {
        ...state,
        conflict: undefined,
        isMutating: true,
        mutationError: undefined,
        statusMessage: action.message,
      }
    case "mutationFailed":
      if (action.conflict) {
        return {
          ...state,
          conflict: action.conflict,
          detailStatus: "ready",
          details: { ...state.details, [action.conflict.current.id]: action.conflict.current },
          inquiries: projectDetailIntoQueue(state.inquiries, action.conflict.current),
          isMutating: false,
          mutationError: action.message,
          statusMessage: "Action failed.",
          unreadCount: projectUnreadCount(state.unreadCount, state.inquiries, action.conflict.current),
        }
      }
      return {
        ...state,
        conflict: action.conflict,
        isMutating: false,
        mutationError: action.message,
        statusMessage: "Action failed.",
      }
    case "mutationSucceeded": {
      const nextDrafts = action.clearDraftMode
        ? updateDraft(state.drafts, action.inquiry.id, action.clearDraftMode, "")
        : state.drafts
      return {
        ...state,
        attachments: action.clearAttachment
          ? { ...state.attachments, [action.inquiry.id]: undefined }
          : state.attachments,
        conflict: undefined,
        contactReauthentication: undefined,
        detailError: undefined,
        detailStatus: "ready",
        details: { ...state.details, [action.inquiry.id]: action.inquiry },
        drafts: nextDrafts,
        inquiries: projectDetailIntoQueue(state.inquiries, action.inquiry),
        isMutating: false,
        mutationError: undefined,
        statusMessage: action.message,
        unreadCount: projectUnreadCount(state.unreadCount, state.inquiries, action.inquiry),
      }
    }
    case "readPositionChanged": {
      const detail = state.details[action.inquiryId]
      const previousUnread = (detail ?? state.inquiries.find((inquiry) => inquiry.id === action.inquiryId))
        ?.unread.isUnread
        ? 1
        : 0
      const nextUnread = action.unread.isUnread ? 1 : 0
      return {
        ...state,
        details: detail
          ? { ...state.details, [action.inquiryId]: { ...detail, unread: action.unread } }
          : state.details,
        inquiries: state.inquiries.map((inquiry) =>
          inquiry.id === action.inquiryId ? { ...inquiry, unread: action.unread } : inquiry,
        ),
        unreadCount: Math.max(0, state.unreadCount - previousUnread + nextUnread),
      }
    }
  }
}

export function hasUnsavedInquiryDrafts(state: InquiryQueueState) {
  return (
    Object.values(state.drafts).some((draft) => draft.note.length > 0 || draft.reply.length > 0) ||
    Object.values(state.attachments).some(Boolean)
  )
}
