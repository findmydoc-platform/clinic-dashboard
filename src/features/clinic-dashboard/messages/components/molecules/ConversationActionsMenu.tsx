"use client"

import { Mail, MailOpen, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu } from "@/components/ui/dropdown-menu"

type ConversationActionsMenuProps = Readonly<{
  onOpenChange: (open: boolean) => void
  onToggleUnread: () => void
  open: boolean
  unreadCount: number
}>

export function ConversationActionsMenu({
  onOpenChange,
  onToggleUnread,
  open,
  unreadCount,
}: ConversationActionsMenuProps) {
  const Icon = unreadCount > 0 ? MailOpen : Mail
  const actionLabel = unreadCount > 0 ? "Mark as read" : "Mark as unread"

  return (
    <div className="relative">
      <DropdownMenu onOpenChange={onOpenChange} open={open}>
        <DropdownMenu.Trigger asChild>
          <Button aria-label="Conversation menu" size="icon" variant="ghost">
            <MoreVertical aria-hidden="true" className="size-5" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" aria-label="Conversation menu" className="z-40 w-52">
          <DropdownMenu.Item
            className="text-[var(--secondary)] data-[highlighted]:text-[var(--secondary)]"
            onSelect={onToggleUnread}
          >
            <Icon aria-hidden="true" className="size-4 text-[var(--primary)]" />
            {actionLabel}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  )
}
