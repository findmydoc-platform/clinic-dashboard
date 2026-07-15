"use client"

import { useCallback, useEffect, useId, useRef } from "react"
import { Mail, MailOpen, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const actionRef = useRef<HTMLButtonElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const menuRef = useRef<HTMLDivElement>(null)
  const focusTargetOnClose = useRef<HTMLElement | null>(null)
  const restoreFocusOnClose = useRef(false)
  const wasOpen = useRef(false)

  const closeMenu = useCallback(
    (restoreFocus: boolean, focusTarget: HTMLElement | null = null) => {
      focusTargetOnClose.current = focusTarget
      restoreFocusOnClose.current = restoreFocus
      onOpenChange(false)
    },
    [onOpenChange],
  )

  useEffect(() => {
    if (!open) {
      const shouldRestoreFocus = wasOpen.current && restoreFocusOnClose.current
      const focusTarget = focusTargetOnClose.current ?? (shouldRestoreFocus ? buttonRef.current : null)
      wasOpen.current = false
      focusTargetOnClose.current = null
      restoreFocusOnClose.current = false
      if (!focusTarget) return

      const frame = requestAnimationFrame(() => focusTarget.focus())
      return () => cancelAnimationFrame(frame)
    }

    wasOpen.current = true
    const frame = requestAnimationFrame(() => actionRef.current?.focus())

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeMenu(true)
        return
      }

      if (event.key === "Tab") {
        const action = actionRef.current
        const focusableElements = Array.from(
          document.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0)
        const actionIndex = action ? focusableElements.indexOf(action) : -1
        const focusTarget = event.shiftKey
          ? buttonRef.current
          : actionIndex >= 0
            ? (focusableElements[actionIndex + 1] ?? null)
            : null
        if (focusTarget) event.preventDefault()
        closeMenu(false, focusTarget)
        return
      }

      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
      event.preventDefault()
      actionRef.current?.focus()
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      closeMenu(false)
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [closeMenu, open])

  const toggleMenu = () => {
    restoreFocusOnClose.current = false
    onOpenChange(!open)
  }

  const handleAction = () => {
    onToggleUnread()
    closeMenu(true)
  }

  const Icon = unreadCount > 0 ? MailOpen : Mail
  const actionLabel = unreadCount > 0 ? "Mark as read" : "Mark as unread"

  return (
    <div className="relative">
      <Button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Conversation menu"
        onClick={toggleMenu}
        ref={buttonRef}
        size="icon"
        variant="ghost"
      >
        <MoreVertical aria-hidden="true" className="size-5" />
      </Button>
      {open ? (
        <div
          className="absolute top-[calc(100%+0.5rem)] right-0 z-40 w-52 rounded-lg border border-[var(--border)] bg-[var(--background)] p-1.5 shadow-xl"
          id={menuId}
          ref={menuRef}
          role="menu"
        >
          <button
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-bold text-[var(--secondary)] hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)]"
            onClick={handleAction}
            ref={actionRef}
            role="menuitem"
            type="button"
          >
            <Icon aria-hidden="true" className="size-4 text-[var(--primary)]" />
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}
