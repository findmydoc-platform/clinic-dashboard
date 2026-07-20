"use client"

import { useEffect, useId, useRef } from "react"
import { Bell, MessageSquare, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getUnreadNotifications, type ClinicDashboardNotification } from "../../model/notifications"

export type { ClinicDashboardNotification } from "../../model/notifications"

type NotificationCenterProps = Readonly<{
  notifications: readonly ClinicDashboardNotification[]
  onMarkAllAsRead: () => void
  onNotificationOpen: (notification: ClinicDashboardNotification) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  readNotificationIds: readonly string[]
}>

export function NotificationCenter({
  notifications,
  onMarkAllAsRead,
  onNotificationOpen,
  onOpenChange,
  open,
  readNotificationIds,
}: NotificationCenterProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const wasOpen = useRef(false)
  const unreadNotifications = getUnreadNotifications(notifications, readNotificationIds)
  const unreadCount = unreadNotifications.length
  const previousUnreadCount = useRef(unreadCount)
  const notificationLabel =
    unreadCount === 0
      ? "Notifications, no new notifications"
      : `Notifications, ${unreadCount} new ${unreadCount === 1 ? "notification" : "notifications"}`

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) requestAnimationFrame(() => buttonRef.current?.focus())
      wasOpen.current = false
      return
    }

    wasOpen.current = true
    requestAnimationFrame(() => panelRef.current?.focus())
    const closePanel = () => onOpenChange(false)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      closePanel()
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      closePanel()
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [onOpenChange, open])

  useEffect(() => {
    const previousCount = previousUnreadCount.current
    previousUnreadCount.current = unreadCount

    if (!open || previousCount === 0 || unreadCount !== 0) return

    requestAnimationFrame(() => statusRef.current?.focus())
  }, [open, unreadCount])

  return (
    <div className="relative">
      <Button
        aria-controls={open ? panelId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={notificationLabel}
        className="relative"
        onClick={() => onOpenChange(!open)}
        ref={buttonRef}
        size="icon"
        variant="ghost"
      >
        <Bell aria-hidden="true" className="size-5" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[var(--destructive)] text-[10px] leading-none font-bold text-[var(--destructive-foreground)]"
          >
            {unreadCount}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div
          aria-label="Notifications"
          className="fixed top-[4.5rem] right-4 left-4 z-50 flex max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-xl focus:outline-none sm:absolute sm:top-[calc(100%+0.5rem)] sm:right-0 sm:left-auto sm:w-96"
          id={panelId}
          ref={panelRef}
          role="dialog"
          tabIndex={-1}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-sm font-bold">Notifications</h2>
            {unreadCount > 0 ? (
              <Button onClick={onMarkAllAsRead} size="small" variant="ghost">
                Mark all as read
              </Button>
            ) : null}
          </div>
          {unreadCount > 0 ? (
            <ul
              aria-label="New notifications"
              className="min-h-0 divide-y divide-[var(--border)] overflow-y-auto"
              tabIndex={0}
            >
              {unreadNotifications.map((notification) => {
                const Icon = notification.type === "message" ? MessageSquare : Star

                return (
                  <li key={notification.id}>
                    <button
                      className="flex min-h-11 w-full gap-3 px-4 py-4 text-left hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)]"
                      onClick={() => onNotificationOpen(notification)}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,var(--background))] text-[var(--primary)]",
                          notification.type === "review" && "bg-[var(--warning)] text-[var(--secondary)]",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-5 font-bold">{notification.title}</span>
                        <span className="mt-1 block text-sm leading-5 text-[var(--foreground)]">
                          {notification.detail}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--foreground)]">
                          <span>{notification.timestamp}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            <span className="sr-only">Location: </span>
                            {notification.locationLabel}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center" ref={statusRef} role="status" tabIndex={-1}>
              <p className="text-sm font-bold">You&apos;re up to date</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">No new notifications.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
