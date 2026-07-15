import type { StaticImageData } from "next/image"

export const conversationSections = ["New inquiries", "Recent chats"] as const

export type ConversationSection = (typeof conversationSections)[number]

export type ConversationTreatment = Readonly<{
  categoryPath?: readonly string[]
  name: string
}>

export type ClinicConversation = Readonly<{
  avatar?: StaticImageData | string
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
  sender: "clinic" | "patient"
  time: string
}>

export type ClinicMessagesFixture = Readonly<{
  activeConversationId: string
  conversations: readonly ClinicConversation[]
  dateLabel: string
  messages: readonly ClinicMessage[]
  patientAvatar?: StaticImageData | string
  patientName: string
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

export function createLocalClinicMessage(body: string, index: number): ClinicMessage {
  return {
    body: body.trim(),
    id: `local-message-${index}`,
    read: "Read 11:08",
    sender: "clinic",
    time: "11:08",
  }
}
