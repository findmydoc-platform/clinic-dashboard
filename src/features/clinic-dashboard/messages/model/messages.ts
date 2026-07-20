export const conversationSections = ["New inquiries", "Recent chats"] as const
const messageAttachmentMimeTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const

export const maximumMessageAttachmentBytes = 5 * 1024 * 1024

export type ConversationSection = (typeof conversationSections)[number]

export type MessageImageSource =
  | string
  | Readonly<{
      blurDataURL?: string
      blurHeight?: number
      blurWidth?: number
      height: number
      src: string
      width: number
    }>

export type ConversationTreatment = Readonly<{
  categoryPath?: readonly string[]
  name: string
}>

export type ConversationDoctor = Readonly<{
  avatar?: MessageImageSource
  id: string
  initials: string
  name: string
  specialty: string
}>

export type ClinicConversation = Readonly<{
  avatar?: MessageImageSource
  doctor: ConversationDoctor
  id: string
  initials: string
  name: string
  preview: string
  section: ConversationSection
  time: string
  treatment?: ConversationTreatment
  unread?: number
}>

export type MessageAttachmentMetadata = Readonly<{
  name: string
  size: number
  type: string
}>

export type ClinicMessage = Readonly<{
  attachment?: MessageAttachmentMetadata
  body: string
  id: string
  read?: string
  sender: "doctor" | "patient"
  time: string
}>

export type MessagesSnapshot = Readonly<{
  activeConversationId: string
  conversations: readonly ClinicConversation[]
  dateLabel: string
  messages: readonly ClinicMessage[]
}>

export type PatientInquiryProfile = Readonly<{
  contactWindow: string
  email: string
  id: string
  interest: string
  message: string
  name: string
  phone: string
  treatmentTimeline: string
}>

export type MessageFocusTarget = Readonly<{ conversationId: string }>

export type ConversationListItemModel = Readonly<{
  conversation: ClinicConversation
  isActive: boolean
  unreadCount: number
}>

export type ConversationSectionModel = Readonly<{
  conversations: readonly ConversationListItemModel[]
  name: ConversationSection
}>

export type MessagesViewModel = Readonly<{
  attachment?: MessageAttachmentMetadata
  attachmentError?: string
  dateLabel: string
  draft: string
  hasFullConversation: boolean
  isInteractive: boolean
  isSending: boolean
  menuOpen: boolean
  messageStatus: string
  mobileThreadOpen: boolean
  searchQuery: string
  sections: readonly ConversationSectionModel[]
  selectedConversation: ClinicConversation
  selectedUnreadCount: number
  totalConversationCount: number
  totalUnreadCount: number
  visibleMessages: readonly ClinicMessage[]
}>

export type MessagesControllerActions = Readonly<{
  onAttachmentRemove: () => void
  onAttachmentSelect: (attachment: MessageAttachmentMetadata) => void
  onConversationSelect: (conversationId: string) => void
  onDraftChange: (draft: string) => void
  onInquiryOpenChange: (open: boolean) => void
  onMenuOpenChange: (open: boolean) => void
  onMessageSend: () => Promise<void>
  onMobileBack: () => void
  onSearchQueryChange: (query: string) => void
  onUnreadToggle: () => void
}>

export type MessagesScreenActions = Omit<MessagesControllerActions, "onInquiryOpenChange"> &
  Readonly<{
    onPatientInquiryOpen: () => void
  }>

export function filterConversations<Conversation extends ClinicConversation>(
  conversations: readonly Conversation[],
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("en")
  if (!normalizedQuery) return [...conversations]

  return conversations.filter((conversation) => {
    const searchableContent = [
      conversation.name,
      conversation.doctor.name,
      conversation.doctor.specialty,
      conversation.preview,
      conversation.treatment?.name,
      ...(conversation.treatment?.categoryPath ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("en")

    return searchableContent.includes(normalizedQuery)
  })
}

export function getConversationUnreadCount(
  conversation: ClinicConversation,
  readConversationIds: readonly string[],
) {
  return readConversationIds.includes(conversation.id) ? 0 : (conversation.unread ?? 0)
}

export function getTotalUnreadCount(
  conversations: readonly ClinicConversation[],
  readConversationIds: readonly string[],
) {
  return conversations.reduce(
    (total, conversation) => total + getConversationUnreadCount(conversation, readConversationIds),
    0,
  )
}

export function validateMessageAttachment(attachment: MessageAttachmentMetadata): string | undefined {
  if (!messageAttachmentMimeTypes.includes(attachment.type as (typeof messageAttachmentMimeTypes)[number])) {
    return "Choose a PNG, JPEG, WebP, or PDF file."
  }
  if (attachment.size > maximumMessageAttachmentBytes) {
    return "The attachment must be 5 MB or smaller."
  }
  return undefined
}

export function formatMessageAttachmentSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
