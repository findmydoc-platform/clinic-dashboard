import { filterPatientInquiries, type InquiryWorkspaceViewModel } from "./inquiry-workspace"
import { canReplyToInquiry } from "./inquiries"
import { hasUnsavedInquiryDrafts, type InquiryQueueState } from "./inquiry-queue.reducer"

export function selectInquiryQueueViewModel(state: InquiryQueueState): InquiryWorkspaceViewModel {
  const selectedInquiry = state.selectedInquiryId ? state.details[state.selectedInquiryId] : undefined
  const visibleInquiries = filterPatientInquiries(state.inquiries, {
    handlingStatus: state.handlingStatusFilter,
    primary: state.lifecycleFilter,
    query: state.searchQuery,
  })
  const canReply = selectedInquiry
    ? canReplyToInquiry(selectedInquiry) && selectedInquiry.actions.canReply
    : false
  const activeComposerMode = canReply ? state.activeComposerMode : "note"
  const draft = selectedInquiry ? (state.drafts[selectedInquiry.id]?.[activeComposerMode] ?? "") : ""
  const replyDraft = selectedInquiry ? (state.drafts[selectedInquiry.id]?.reply ?? "") : ""
  const noteDraft = selectedInquiry ? (state.drafts[selectedInquiry.id]?.note ?? "") : ""
  const replyAttachment = selectedInquiry ? state.attachments[selectedInquiry.id] : undefined
  const blockedReplyDraft = selectedInquiry && !canReply && replyDraft ? replyDraft : undefined
  const blockedReplyAttachment = selectedInquiry && !canReply ? replyAttachment : undefined

  return {
    activeComposerMode,
    attachment:
      selectedInquiry && activeComposerMode === "reply" ? state.attachments[selectedInquiry.id] : undefined,
    attachmentAccessPaths: {},
    availability: state.availability,
    blockedReplyAttachment,
    blockedReplyDraft,
    canConvertReplyDraftToNote: Boolean(
      selectedInquiry?.actions.canAddInternalNote &&
      blockedReplyDraft &&
      (noteDraft ? `${noteDraft}\n\n${blockedReplyDraft}` : blockedReplyDraft).length <= 3_000,
    ),
    conflict: state.conflict,
    contactReauthentication: state.contactReauthentication,
    detailError: state.detailError,
    detailStatus: state.detailStatus,
    draft,
    handlingStatusFilter: state.handlingStatusFilter,
    hasPendingReplyDraft: selectedInquiry
      ? Boolean(state.drafts[selectedInquiry.id]?.reply.length || state.attachments[selectedInquiry.id])
      : false,
    hasUnsavedDrafts: hasUnsavedInquiryDrafts(state),
    isMutating: state.isMutating,
    isLoadingQueue: state.isLoadingQueue,
    lifecycleFilter: state.lifecycleFilter,
    mobileDetailOpen: state.mobilePane === "inquiry",
    mutationError: state.mutationError,
    nextCursor: state.nextCursor,
    searchQuery: state.searchQuery,
    selectedInquiry,
    selectedInquiryId: state.selectedInquiryId,
    selectedInquirySummary: state.selectedInquiryId
      ? state.inquiries.find(({ id }) => id === state.selectedInquiryId)
      : undefined,
    statusMessage: state.statusMessage,
    totalUnreadCount: state.unreadCount,
    visibleInquiries: visibleInquiries.map((inquiry) => ({
      inquiry,
      isActive: inquiry.id === state.selectedInquiryId,
    })),
  }
}
