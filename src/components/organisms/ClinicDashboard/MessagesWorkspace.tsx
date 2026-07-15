"use client"

import { useState } from "react"
import { MessagesWorkspaceView } from "@/components/organisms/ClinicDashboard/MessagesWorkspaceView"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import {
  createLocalClinicMessage,
  getConversationUnreadCount,
  type ClinicMessage,
} from "@/lib/clinic-dashboard/messages"
import { isGateVisible, type ClinicDashboardVariant } from "@/lib/clinic-dashboard/visibility"

export function MessagesWorkspace({
  onOpenPatientProfile,
  variant,
}: {
  onOpenPatientProfile: () => void
  variant: ClinicDashboardVariant
}) {
  const data = clinicDashboardFixture.messages
  const interactive = isGateVisible(variant, "messaging")
  const [activeConversationId, setActiveConversationId] = useState(data.activeConversationId)
  const [draft, setDraft] = useState("")
  const [localMessages, setLocalMessages] = useState<readonly ClinicMessage[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false)
  const [readConversationIds, setReadConversationIds] = useState<readonly string[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const selectConversation = (conversationId: string) => {
    const conversation = data.conversations.find(({ id }) => id === conversationId)
    setActiveConversationId(conversationId)
    setMenuOpen(false)
    setMobileThreadOpen(true)
    if (!conversation?.unread) return
    setReadConversationIds((current) =>
      current.includes(conversationId) ? current : [...current, conversationId],
    )
  }

  const toggleUnread = () => {
    const conversation = data.conversations.find(({ id }) => id === activeConversationId)
    if (!conversation?.unread) return
    const unreadCount = getConversationUnreadCount(conversation, readConversationIds)
    setReadConversationIds((current) =>
      unreadCount > 0
        ? current.includes(conversation.id)
          ? current
          : [...current, conversation.id]
        : current.filter((conversationId) => conversationId !== conversation.id),
    )
  }

  const sendMessage = (message: string) => {
    if (activeConversationId !== data.activeConversationId) return
    setLocalMessages((current) => [...current, createLocalClinicMessage(message, current.length + 1)])
    setDraft("")
  }

  return (
    <MessagesWorkspaceView
      activeConversationId={activeConversationId}
      data={data}
      draft={draft}
      interactive={interactive}
      localMessages={localMessages}
      menuOpen={interactive && menuOpen}
      mobileThreadOpen={interactive && mobileThreadOpen}
      onDraftChange={setDraft}
      onMenuOpenChange={setMenuOpen}
      onMobileBack={() => setMobileThreadOpen(false)}
      onOpenPatientProfile={onOpenPatientProfile}
      onSearchQueryChange={setSearchQuery}
      onSelectConversation={selectConversation}
      onSend={sendMessage}
      onToggleUnread={toggleUnread}
      readConversationIds={readConversationIds}
      searchQuery={searchQuery}
    />
  )
}
