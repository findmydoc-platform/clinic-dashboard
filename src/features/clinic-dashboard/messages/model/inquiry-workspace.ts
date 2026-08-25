import type {
  InquiryHandlingStatus,
  InquiryHandlingStatusTarget,
  PatientInquiry,
  PatientInquiryDetail,
  PatientInquiryQueueSnapshot,
} from "./inquiries"

const inquiryPrimaryFilterValues = ["open", "unread", "closed", "spam", "all"] as const

export type InquiryPrimaryFilter = (typeof inquiryPrimaryFilterValues)[number]
export type InquiryComposerMode = "note" | "reply"

export type InquiryAttachmentDraft = Readonly<{
  draftId: string
  expiresAt: string
  fileName: string
  mimeType: string
  sizeBytes: number
  status: "ready" | "uploading"
}>

export type InquiryAttachmentDraftState =
  | Readonly<{
      fileName: string
      mimeType: string
      sizeBytes: number
      status: "uploading"
    }>
  | InquiryAttachmentDraft
  | Readonly<{
      draftId?: string
      fileName: string
      message: string
      mimeType: string
      sizeBytes: number
      status: "failed" | "invalid"
    }>

export type InquiryConflictResolution = Readonly<{
  current: PatientInquiryDetail
  message: string
}>

export type InquiryContactReauthentication = Readonly<{
  message: string
  status: "invalid" | "required" | "unavailable"
}>

export type InquiryAttachmentAccessPaths = Readonly<{
  download: string
  preview: string
}>

export type InquiryWorkspaceViewModel = Readonly<{
  activeComposerMode: InquiryComposerMode
  attachment?: InquiryAttachmentDraftState
  attachmentAccessPaths: Readonly<Record<string, InquiryAttachmentAccessPaths>>
  availability: PatientInquiryQueueSnapshot["status"]
  blockedReplyAttachment?: InquiryAttachmentDraftState
  blockedReplyDraft?: string
  canConvertReplyDraftToNote: boolean
  conflict?: InquiryConflictResolution
  contactReauthentication?: InquiryContactReauthentication
  detailError?: string
  detailStatus: "idle" | "loading" | "ready" | "refresh-error"
  draft: string
  handlingStatusFilter: readonly Exclude<InquiryHandlingStatus, "spam">[]
  hasPendingReplyDraft: boolean
  hasUnsavedDrafts: boolean
  isLoadingQueue: boolean
  isMutating: boolean
  lifecycleFilter: InquiryPrimaryFilter
  mobileDetailOpen: boolean
  mutationError?: string
  nextCursor?: string
  searchQuery: string
  selectedInquiry?: PatientInquiryDetail
  selectedInquiryId?: string
  selectedInquirySummary?: PatientInquiry
  statusMessage: string
  totalUnreadCount: number
  visibleInquiries: readonly Readonly<{ inquiry: PatientInquiry; isActive: boolean }>[]
}>

export type InquiryWorkspaceActions = Readonly<{
  onAttachmentRemove: () => Promise<void>
  onAttachmentRetry: () => Promise<void>
  onAttachmentSelect: (file: File) => Promise<void>
  onComposerModeChange: (mode: InquiryComposerMode) => void
  onConflictDismiss: () => void
  onReplyDraftConvertToNote: () => void
  onDraftChange: (value: string) => void
  onHandlingStatusChange: (status: InquiryHandlingStatusTarget) => Promise<void>
  onContactReveal: () => Promise<void>
  onContactReauthenticate: (password: string) => Promise<void>
  onContactReauthenticationDismiss: () => void
  onInquirySelect: (inquiryId: string) => Promise<void>
  onLifecycleToggle: (
    input?: Readonly<{ draftDiscardConfirmed?: boolean; reason?: string }>,
  ) => Promise<boolean>
  onLoadMore: () => Promise<void>
  onMarkReadToggle: () => Promise<void>
  onMobileBack: () => void
  onQueueRefresh: () => Promise<void>
  onRefresh: () => Promise<void>
  onSearchQueryChange: (query: string) => void
  onStatusFilterChange: (statuses: readonly Exclude<InquiryHandlingStatus, "spam">[]) => void
  onPrimaryFilterChange: (filter: InquiryPrimaryFilter) => void
  onSend: () => Promise<void>
  onSpamToggle: (input?: Readonly<{ draftDiscardConfirmed?: boolean; reason?: string }>) => Promise<boolean>
}>

export function filterPatientInquiries(
  inquiries: readonly PatientInquiry[],
  input: Readonly<{
    handlingStatus: InquiryWorkspaceViewModel["handlingStatusFilter"]
    primary: InquiryPrimaryFilter
    query: string
  }>,
) {
  const query = input.query.trim().toLocaleLowerCase("en")

  return inquiries.filter((inquiry) => {
    const primaryMatches =
      input.primary === "all" ||
      (input.primary === "open" && inquiry.lifecycle === "open" && inquiry.handlingStatus !== "spam") ||
      (input.primary === "closed" && inquiry.lifecycle === "closed" && inquiry.handlingStatus !== "spam") ||
      (input.primary === "spam" && inquiry.handlingStatus === "spam") ||
      (input.primary === "unread" && inquiry.unread.isUnread)
    const statusMatches =
      input.handlingStatus.length === 0 || input.handlingStatus.includes(inquiry.handlingStatus as never)
    // The Website contract owns search across messages, notes and attachment names.
    // Re-filtering its result from the smaller queue DTO would drop valid matches.
    void query
    return primaryMatches && statusMatches
  })
}

export function formatInquiryAttachmentSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}
