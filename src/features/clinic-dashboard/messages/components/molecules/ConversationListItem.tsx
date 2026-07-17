import { forwardRef } from "react"
import { ChevronRight } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { ClinicConversation } from "../../model/messages"

type ConversationListItemProps = Readonly<{
  active: boolean
  conversation: ClinicConversation
  interactive: boolean
  onSelect: () => void
  unreadCount: number
}>

export const ConversationListItem = forwardRef<HTMLButtonElement, ConversationListItemProps>(
  function ConversationListItem({ active, conversation, interactive, onSelect, unreadCount }, ref) {
    const className = cn(
      "flex min-h-24 w-full items-center border-b border-[var(--border)] px-4 py-3 text-left transition-colors sm:px-5",
      interactive && "hover:bg-[var(--surface)]",
      active && "border-l-4 border-l-[var(--accent)] bg-[var(--accent-soft)] pl-3 sm:pl-4",
    )
    const content = (
      <>
        <Avatar className="mr-3 size-12" initials={conversation.initials} src={conversation.avatar} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <strong className="truncate text-sm text-[var(--secondary)]">{conversation.name}</strong>
            <span className="shrink-0 text-[11px] text-[var(--foreground)]">{conversation.time}</span>
          </span>
          {conversation.treatment ? (
            <span className="mt-1 block truncate text-xs font-bold text-[var(--primary-hover)]">
              {conversation.treatment.name}
            </span>
          ) : null}
          <span className="mt-1 block truncate text-sm text-[var(--foreground)]">{conversation.preview}</span>
        </span>
        {unreadCount > 0 ? (
          <span
            aria-label={`${unreadCount} unread ${unreadCount === 1 ? "message" : "messages"}`}
            className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--accent)] px-2 py-1 text-[10px] leading-none font-bold text-[var(--accent-foreground)]"
          >
            {unreadCount}
          </span>
        ) : null}
        {interactive ? (
          <ChevronRight
            aria-hidden="true"
            className="ml-1 size-4 shrink-0 text-[var(--foreground)] lg:hidden"
          />
        ) : null}
      </>
    )

    if (!interactive) {
      return (
        <div aria-current={active ? "page" : undefined} className={className}>
          {content}
        </div>
      )
    }

    return (
      <button
        aria-current={active ? "page" : undefined}
        className={className}
        data-conversation-id={conversation.id}
        onClick={onSelect}
        ref={ref}
        type="button"
      >
        {content}
      </button>
    )
  },
)
