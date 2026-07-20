export const conversationSections = ["New inquiries", "Recent chats"] as const

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

export type ClinicMessage = Readonly<{
  attachmentSummary?: string
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
  age: string
  avatar?: MessageImageSource
  email: string
  gender: string
  interest: string
  lastVisit: string
  medicalNotes: string
  name: string
}>

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
  dateLabel: string
  draft: string
  hasFullConversation: boolean
  isInteractive: boolean
  menuOpen: boolean
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
  onConversationSelect: (conversationId: string) => void
  onDraftChange: (draft: string) => void
  onMenuOpenChange: (open: boolean) => void
  onMessageSend: (message: string) => void
  onMobileBack: () => void
  onSearchQueryChange: (query: string) => void
  onUnreadToggle: () => void
}>

export type MessagesScreenActions = MessagesControllerActions &
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

export function createLocalDoctorMessage(body: string, index: number): ClinicMessage {
  return {
    body: body.trim(),
    id: `local-message-${index}`,
    read: "Read 11:08",
    sender: "doctor",
    time: "11:08",
  }
}
