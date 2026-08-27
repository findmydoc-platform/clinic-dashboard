export const inquiryHandlingStatusValues = ["submitted", "in_review", "contacted", "spam"] as const
export const inquiryLifecycleValues = ["open", "closed"] as const

export type InquiryHandlingStatus = (typeof inquiryHandlingStatusValues)[number]
export type InquiryHandlingStatusTarget = Exclude<InquiryHandlingStatus, "spam" | "submitted">
export type InquiryLifecycle = (typeof inquiryLifecycleValues)[number]

export const inquiryErrorCodeValues = [
  "invalid-input",
  "unauthorized",
  "access-denied",
  "not-found",
  "conflict",
  "invalid-state",
  "payload-too-large",
  "unsupported-media-type",
  "rate-limited",
  "service-unavailable",
  "service-timeout",
  "reauthentication-required",
] as const

export type InquiryErrorCode = (typeof inquiryErrorCodeValues)[number]

export type InquiryAttachment = Readonly<{
  id: string
  mimeType: string
  name: string
  sizeBytes: number
}>

export type InquiryContentState = "available" | "hard-deleted" | "restricted"

export type InquiryContentModeration = Readonly<{
  appeal?: Readonly<{ caseId: string; state: "available" | "submitted" | "unavailable" }>
  category?: string
  effectiveUntil?: string
  isCurrentActorAffected: boolean
}>

export type InquiryTimelineItem =
  | Readonly<{
      attachment?: InquiryAttachment
      attachmentModeration?: InquiryContentModeration
      attachmentState?: InquiryContentState
      author: Readonly<{
        kind: "clinic" | "patient"
        label: string
        staffName?: string
      }>
      body: string
      contentState?: InquiryContentState
      createdAt: string
      id: string
      kind: "external-message"
      moderation?: InquiryContentModeration
      timeLabel: string
    }>
  | Readonly<{
      authorName?: string
      body?: string
      contentState?: Exclude<InquiryContentState, "restricted">
      createdAt: string
      id: string
      kind: "internal-note"
      timeLabel: string
    }>
  | Readonly<{
      actorName: string
      body: string
      createdAt: string
      id: string
      kind: "system-event"
      timeLabel: string
    }>

export type InquiryPatientProjection =
  | Readonly<{
      initials: string
      kind: "verified"
      name: string
    }>
  | Readonly<{
      initials: string
      kind: "guest"
      name: string
    }>
  | Readonly<{
      kind: "deleted"
      name: "Deleted patient"
    }>

export type InquiryConversationProjection =
  | Readonly<{ id: string; kind: "bound" }>
  | Readonly<{ id: string; kind: "deleted-patient" }>
  | Readonly<{ kind: "guest" }>

export type InquiryContactProjection =
  | Readonly<{
      email?: string
      phone?: string
      state: "full"
    }>
  | Readonly<{ state: "collapsed" | "masked" | "unavailable" }>

export type InquiryUnreadProjection = Readonly<{
  count: number
  isUnread: boolean
  lastReadActivityId?: string
}>

export type PatientInquiry = Readonly<{
  changeCursor: string
  contactWindow: string
  conversation: InquiryConversationProjection
  createdAt: string
  handlingStatus: InquiryHandlingStatus
  id: string
  interest: string
  lastActivityAt: string
  lastActivityLabel: string
  lastActivityPreview: string
  latestActivityKind: InquiryTimelineItem["kind"] | "inquiry"
  lifecycle: InquiryLifecycle
  originalRequestPreview: string
  patient: InquiryPatientProjection
  receivedLabel: string
  revision: number
  treatmentTimeline: string
  unread: InquiryUnreadProjection
}>

export type PatientInquiryDetail = PatientInquiry &
  Readonly<{
    actions: Readonly<{
      canAddInternalNote: boolean
      canChangeHandlingStatus: boolean
      canChangeLifecycle: boolean
      canMarkRead: boolean
      canMarkUnread: boolean
      canReply: boolean
      canRevealContact: boolean
    }>
    contact: InquiryContactProjection
    originalRequest?: string
    originalRequestContentState?: Exclude<InquiryContentState, "restricted">
    timeline: readonly InquiryTimelineItem[]
  }>

export type PatientInquiryQueueSnapshot =
  | Readonly<{
      changeCursor: string
      inquiries: readonly PatientInquiry[]
      nextCursor?: string
      status: "ready"
      unchanged: boolean
      unreadCount: number
    }>
  | Readonly<{
      changeCursor?: undefined
      inquiries: readonly []
      status: "temporarily-unavailable"
    }>

export type InquiryQueueQuery = Readonly<{
  cursor?: string
  handlingStatus?: readonly InquiryHandlingStatus[]
  knownChangeCursor?: string
  lifecycle: InquiryLifecycle | "all"
  query?: string
  unreadOnly: boolean
}>

export type InquiryWorkspaceError = Readonly<{
  code: InquiryErrorCode
  current?: PatientInquiryDetail
}>

export type InquiryResult<TValue> =
  Readonly<{ ok: true; value: TValue }> | Readonly<{ error: InquiryWorkspaceError; ok: false }>

export type InquiryDetailResult = Readonly<{
  changeCursor: string
  inquiry: PatientInquiryDetail
  unchanged: boolean
}>

const handlingStatusLabels = {
  contacted: "Contacted",
  in_review: "In review",
  spam: "Spam",
  submitted: "Submitted",
} as const satisfies Record<InquiryHandlingStatus, string>

const handlingStatusTargets = {
  contacted: ["in_review"],
  in_review: ["contacted"],
  spam: [],
  submitted: ["in_review", "contacted"],
} as const satisfies Record<InquiryHandlingStatus, readonly InquiryHandlingStatusTarget[]>

export function getInquiryHandlingStatusLabel(status: InquiryHandlingStatus) {
  return handlingStatusLabels[status]
}

export function getInquiryHandlingStatusTargets(status: InquiryHandlingStatus) {
  return handlingStatusTargets[status]
}

export function canReplyToInquiry(inquiry: PatientInquiry) {
  return (
    inquiry.conversation.kind === "bound" && inquiry.lifecycle === "open" && inquiry.handlingStatus !== "spam"
  )
}
