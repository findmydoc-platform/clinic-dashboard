"use client"

import { useEffect, useRef } from "react"
import { ArrowLeft, FileImage, FileText, MessageSquare, Search, Stethoscope } from "lucide-react"
import { AvatarInitials } from "@/components/atoms/DashboardPrimitives"
import { ConversationActionsMenu } from "@/components/molecules/ConversationActionsMenu"
import { ConversationListItem } from "@/components/molecules/ConversationListItem"
import { MessageComposer } from "@/components/molecules/MessageComposer"
import { Button } from "@/components/ui/button"
import {
  conversationSections,
  filterConversations,
  getConversationUnreadCount,
  getTotalUnreadCount,
  type ClinicMessage,
  type ClinicMessagesFixture,
} from "@/lib/clinic-dashboard/messages"
import { cn } from "@/lib/utils"

type MessagesWorkspaceViewProps = Readonly<{
  activeConversationId: string
  data: ClinicMessagesFixture
  draft: string
  interactive: boolean
  localMessages: readonly ClinicMessage[]
  menuOpen: boolean
  mobileThreadOpen: boolean
  onDraftChange: (draft: string) => void
  onMenuOpenChange: (open: boolean) => void
  onMobileBack: () => void
  onOpenPatientProfile: () => void
  onSearchQueryChange: (query: string) => void
  onSelectConversation: (conversationId: string) => void
  onSend: (message: string) => void
  onToggleUnread: () => void
  readConversationIds: readonly string[]
  searchQuery: string
}>

export function MessagesWorkspaceView({
  activeConversationId,
  data,
  draft,
  interactive,
  localMessages,
  menuOpen,
  mobileThreadOpen,
  onDraftChange,
  onMenuOpenChange,
  onMobileBack,
  onOpenPatientProfile,
  onSearchQueryChange,
  onSelectConversation,
  onSend,
  onToggleUnread,
  readConversationIds,
  searchQuery,
}: MessagesWorkspaceViewProps) {
  const conversationRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const mobileThreadHeadingRef = useRef<HTMLHeadingElement>(null)
  const filteredConversations = filterConversations(data.conversations, searchQuery)
  const selectedConversation =
    data.conversations.find(({ id }) => id === activeConversationId) ?? data.conversations[0]
  const selectedUnreadCount = getConversationUnreadCount(selectedConversation, readConversationIds)
  const totalUnreadCount = getTotalUnreadCount(data.conversations, readConversationIds)
  const hasFullConversation = selectedConversation.id === data.activeConversationId
  const visibleMessages = hasFullConversation ? [...data.messages, ...localMessages] : []

  useEffect(() => {
    if (!interactive || !mobileThreadOpen || window.matchMedia("(min-width: 1024px)").matches) return

    const frame = requestAnimationFrame(() => mobileThreadHeadingRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [interactive, mobileThreadOpen, selectedConversation.id])

  const returnToConversationList = () => {
    onMobileBack()
    requestAnimationFrame(() => conversationRefs.current[selectedConversation.id]?.focus())
  }

  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm lg:grid-cols-[22rem_minmax(0,1fr)]",
        interactive ? "h-[calc(100dvh-7rem)] min-h-[36rem]" : "min-h-[calc(100dvh-11rem)]",
      )}
    >
      <section
        aria-labelledby="conversation-list-heading"
        className={cn(
          "min-w-0 border-b border-[var(--border)] lg:block lg:border-r lg:border-b-0",
          interactive && "min-h-0 overflow-y-auto",
          interactive && mobileThreadOpen && "hidden",
        )}
      >
        <div className="space-y-4 border-b border-[var(--border)] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-[var(--secondary)]" id="conversation-list-heading">
              Messages
            </h1>
            {totalUnreadCount > 0 ? (
              <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-bold text-[var(--on-primary)]">
                {totalUnreadCount} new
              </span>
            ) : (
              <span className="text-xs font-bold text-[var(--foreground)]">All read</span>
            )}
          </div>
          {interactive ? (
            <label className="relative block">
              <span className="sr-only">Search conversations</span>
              <Search
                aria-hidden="true"
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--foreground)]"
              />
              <input
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pr-3 pl-10 text-sm text-[var(--secondary)] placeholder:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
                placeholder="Search patients or treatments…"
                type="search"
                value={searchQuery}
              />
            </label>
          ) : null}
        </div>
        <div aria-live="polite">
          {conversationSections.map((section) => {
            const sectionConversations = filteredConversations.filter(
              (conversation) => conversation.section === section,
            )
            if (sectionConversations.length === 0) return null

            return (
              <div key={section}>
                <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase sm:px-5">
                  {section}
                </div>
                {sectionConversations.map((conversation) => (
                  <ConversationListItem
                    active={conversation.id === selectedConversation.id}
                    conversation={conversation}
                    interactive={interactive}
                    key={conversation.id}
                    onSelect={() => onSelectConversation(conversation.id)}
                    ref={(element) => {
                      conversationRefs.current[conversation.id] = element
                    }}
                    unreadCount={getConversationUnreadCount(conversation, readConversationIds)}
                  />
                ))}
              </div>
            )
          })}
          {filteredConversations.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-bold text-[var(--secondary)]">No conversations found</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">Try another patient or treatment.</p>
            </div>
          ) : null}
        </div>
      </section>

      <section
        aria-label={"Conversation with " + selectedConversation.name}
        className={cn(
          "min-w-0 flex-col lg:flex",
          interactive ? "min-h-0 overflow-hidden" : "min-h-[42rem]",
          interactive && !mobileThreadOpen ? "hidden" : "flex",
        )}
      >
        <header className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:p-5">
          <div className="flex w-full items-start gap-2 sm:items-center sm:gap-3">
            {interactive ? (
              <Button
                aria-label="Back to conversations"
                className="shrink-0 lg:hidden"
                onClick={returnToConversationList}
                size="icon"
                variant="ghost"
              >
                <ArrowLeft aria-hidden="true" className="size-5" />
              </Button>
            ) : null}
            <AvatarInitials
              className="size-11 sm:size-12"
              initials={selectedConversation.initials}
              src={selectedConversation.avatar}
            />
            <div className="min-w-0 flex-1">
              <h1
                className="truncate text-lg font-bold text-[var(--secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:text-xl lg:hidden"
                ref={mobileThreadHeadingRef}
                tabIndex={-1}
              >
                {selectedConversation.name}
              </h1>
              <h2 className="hidden truncate text-lg font-bold text-[var(--secondary)] sm:text-xl lg:block">
                {selectedConversation.name}
              </h2>
              {selectedConversation.treatment ? (
                <div className="mt-1 text-xs leading-5 sm:text-sm">
                  <p className="flex items-center gap-1 text-[var(--foreground)]">
                    <Stethoscope aria-hidden="true" className="size-4 shrink-0" />
                    Treatment:{" "}
                    <strong className="text-[var(--secondary)]">{selectedConversation.treatment.name}</strong>
                  </p>
                  {selectedConversation.treatment.categoryPath?.length ? (
                    <p className="text-[var(--foreground)]">
                      Category: {selectedConversation.treatment.categoryPath.join(" / ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            {hasFullConversation ? (
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <Button
                  aria-label="View patient profile"
                  className="hidden sm:inline-flex"
                  onClick={onOpenPatientProfile}
                  variant="outline"
                >
                  <FileText aria-hidden="true" className="size-4" />
                  View patient profile
                </Button>
                {interactive ? (
                  <ConversationActionsMenu
                    onOpenChange={onMenuOpenChange}
                    onToggleUnread={onToggleUnread}
                    open={menuOpen}
                    unreadCount={selectedUnreadCount}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          {hasFullConversation ? (
            <Button
              aria-label="View patient profile"
              className="w-full sm:hidden"
              onClick={onOpenPatientProfile}
              variant="outline"
            >
              <FileText aria-hidden="true" className="size-4" />
              View patient profile
            </Button>
          ) : null}
        </header>

        {hasFullConversation ? (
          <>
            <div
              aria-label={"Messages with " + selectedConversation.name}
              aria-live="polite"
              aria-relevant="additions"
              className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-[var(--canvas)] p-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)] sm:p-6"
              role="log"
              tabIndex={0}
            >
              <div className="flex items-center gap-3" role="separator">
                <span className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
                  {data.dateLabel}
                </span>
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
              {visibleMessages.map((message) => (
                <div className={cn("flex", message.sender === "clinic" && "justify-end")} key={message.id}>
                  <div
                    className={cn("max-w-[88%] sm:max-w-[70%]", message.sender === "clinic" && "text-right")}
                  >
                    <div
                      className={cn(
                        "rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-left text-sm leading-6 shadow-sm",
                        message.sender === "clinic" &&
                          "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]",
                      )}
                    >
                      {message.body}
                      {message.attachmentSummary ? (
                        <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--surface)] p-3 text-[var(--secondary)]">
                          <FileImage aria-hidden="true" className="size-5" />
                          {message.attachmentSummary}
                        </div>
                      ) : null}
                    </div>
                    <span className="mt-1 block text-xs text-[var(--foreground)]">
                      {message.time}
                      {message.read ? " · " + message.read : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {interactive ? (
              <MessageComposer draft={draft} onDraftChange={onDraftChange} onSend={onSend} />
            ) : null}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-[var(--canvas)] p-6">
            <div className="max-w-md rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 text-center shadow-sm">
              <MessageSquare aria-hidden="true" className="mx-auto size-8 text-[var(--primary)]" />
              <h3 className="mt-4 text-lg font-bold text-[var(--secondary)]">Conversation preview</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--secondary)]">
                “{selectedConversation.preview}”
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">
                Full conversation details are not available in this prototype.
              </p>
              <p className="mt-4 text-xs font-bold text-[var(--foreground)]">
                Last activity {selectedConversation.time}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
